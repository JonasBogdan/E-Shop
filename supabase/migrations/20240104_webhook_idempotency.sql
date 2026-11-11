-- Webhook idempotency and atomic fulfillment
-- ⚠️  REVIEW BEFORE APPLYING. Run after 20240103_rls.sql.
-- Prerequisites: run as a database superuser in Supabase SQL Editor.
--
-- Rollback:
--   REVOKE ALL ON FUNCTION fulfill_order(UUID, TEXT) FROM PUBLIC;
--   DROP FUNCTION IF EXISTS fulfill_order(UUID, TEXT);
--   DROP TABLE IF EXISTS stripe_webhook_events;
--   ALTER TABLE orders DROP COLUMN IF EXISTS fulfillment_status;
--   (notifications_sent column drops with the table)

-- ── 1. Event log ─────────────────────────────────────────────────────────
-- Tracks each Stripe event exactly once via the PRIMARY KEY.
-- status values:
--   processing  — claimed; work is in progress (or process crashed mid-flight)
--   completed   — all side-effects applied successfully
--   failed      — work failed; a later Stripe retry may re-claim this row
--
-- Crash recovery: the TypeScript webhook handler re-claims 'processing' rows
-- whose created_at is older than 10 minutes (lease timeout), treating them as
-- if they were 'failed' so the next Stripe delivery can retry them.
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id  TEXT        PRIMARY KEY,
  event_type       TEXT        NOT NULL,
  order_id         UUID,
  status              TEXT        NOT NULL DEFAULT 'processing'
                                  CHECK (status IN ('processing', 'completed', 'failed')),
  error               TEXT,
  -- TRUE once both notification emails (customer + admin) have been sent.
  -- Checked on retry so fulfilled orders do not receive duplicate emails.
  notifications_sent  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

-- Lock down with RLS (service role bypasses this automatically)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated — only service role may access.

-- ── 2. Fulfillment status on orders ──────────────────────────────────────
-- Separates "has the customer paid?" from "has inventory been decremented?".
-- Without this, the event-claim lock is the only guard against double work.
-- With it, fulfill_order is idempotent even if the event record is lost.
--
-- NOTE: 'fulfilled' here means inventory has been decremented — it does NOT
-- mean the parcel has been physically dispatched to the customer.  Physical
-- dispatch is tracked via the separate orders.status field ('shipped',
-- 'delivered') which the admin updates manually.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (fulfillment_status IN ('pending', 'fulfilled'));

-- ── 3. Atomic fulfillment function ───────────────────────────────────────
-- Decrements stock for every order item and increments coupon usage
-- in a single transaction protected by a row-level lock on the order.
--
-- Returns:
--   'fulfilled'          — inventory decremented successfully in this call
--   'already_fulfilled'  — idempotent skip; a prior call already did it
--
-- Raises an exception on any error (including insufficient stock), causing
-- the caller to roll back ALL changes in this call so none are partially
-- applied.  The webhook handler catches this, marks the event 'failed', and
-- returns HTTP 500 so Stripe retries.
--
-- Insufficient stock policy: if stock < quantity for any item, the entire
-- fulfillment is aborted.  The order remains in fulfillment_status='pending'.
-- An admin must resolve the inventory shortfall manually (re-stock, refund,
-- or partial fulfilment) — no automatic cancellation or refund is performed.
--
-- Security:
--   SECURITY DEFINER — runs as the function owner (postgres), bypassing RLS.
--   SET search_path  — prevents search_path injection attacks.
--   EXECUTE revoked from PUBLIC, not granted to anon/authenticated; only
--   service_role (which bypasses all grants) may call this via supabase.rpc().
CREATE OR REPLACE FUNCTION fulfill_order(
  p_order_id    UUID,
  p_coupon_code TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fulfillment_status TEXT;
  v_item               RECORD;
  v_rows_updated       INTEGER;
BEGIN
  -- Lock the order row to serialise concurrent webhook deliveries.
  -- A second concurrent call blocks here until the first transaction commits,
  -- then observes fulfillment_status = 'fulfilled' and returns 'already_fulfilled'.
  SELECT fulfillment_status
  INTO   v_fulfillment_status
  FROM   orders
  WHERE  id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_fulfillment_status = 'fulfilled' THEN
    RETURN 'already_fulfilled';
  END IF;

  -- Decrement stock for every order item.
  -- Each UPDATE includes stock >= quantity so it only succeeds when there is
  -- sufficient inventory.  GET DIAGNOSTICS catches the case where the product
  -- row was not found OR stock was insufficient — both fail identically here.
  FOR v_item IN
    SELECT variant_id, product_id, quantity
    FROM   order_items
    WHERE  order_id = p_order_id
  LOOP
    IF v_item.variant_id IS NOT NULL THEN
      UPDATE product_variants
      SET    stock      = stock - v_item.quantity,
             updated_at = NOW()
      WHERE  id    = v_item.variant_id
        AND  stock >= v_item.quantity;

      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
      IF v_rows_updated = 0 THEN
        RAISE EXCEPTION
          'Insufficient stock or missing variant % (qty requested: %)',
          v_item.variant_id, v_item.quantity;
      END IF;

    ELSIF v_item.product_id IS NOT NULL THEN
      UPDATE products
      SET    stock      = stock - v_item.quantity,
             updated_at = NOW()
      WHERE  id    = v_item.product_id
        AND  stock >= v_item.quantity;

      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
      IF v_rows_updated = 0 THEN
        RAISE EXCEPTION
          'Insufficient stock or missing product % (qty requested: %)',
          v_item.product_id, v_item.quantity;
      END IF;
    END IF;
  END LOOP;

  -- Increment coupon usage (no-op if the coupon has since been deleted)
  IF p_coupon_code IS NOT NULL THEN
    UPDATE coupons
    SET    uses_count = uses_count + 1,
           updated_at = NOW()
    WHERE  code = p_coupon_code;
  END IF;

  -- Mark the order's inventory as decremented
  UPDATE orders
  SET    fulfillment_status = 'fulfilled',
         updated_at         = NOW()
  WHERE  id = p_order_id;

  RETURN 'fulfilled';
END;
$$;

-- Revoke the default PUBLIC execute privilege, then grant only to service_role.
-- service_role is NOT a superuser in Supabase's PostgreSQL — it has BYPASSRLS
-- but still needs an explicit GRANT to execute SECURITY DEFINER functions.
REVOKE ALL    ON FUNCTION fulfill_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fulfill_order(UUID, TEXT) TO service_role;
