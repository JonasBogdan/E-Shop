-- Webhook idempotency and atomic fulfillment
-- ⚠️  REVIEW BEFORE APPLYING. Run after 20240103_rls.sql.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS fulfill_order(UUID, TEXT);
--   DROP TABLE IF EXISTS stripe_webhook_events;
--   ALTER TABLE orders DROP COLUMN IF EXISTS fulfillment_status;

-- ── 1. Event log ─────────────────────────────────────────────────────────
-- Tracks each Stripe event exactly once via the PRIMARY KEY.
-- status values:
--   processing  — claimed; work is in progress (or process crashed mid-flight)
--   completed   — all side-effects applied successfully
--   failed      — work failed; a later Stripe retry may re-claim this row
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id  TEXT        PRIMARY KEY,
  event_type       TEXT        NOT NULL,
  order_id         UUID,
  status           TEXT        NOT NULL DEFAULT 'processing'
                               CHECK (status IN ('processing', 'completed', 'failed')),
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ
);

-- Lock down with RLS (service role bypasses this automatically)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated — only service role may access.

-- ── 2. Fulfillment status on orders ──────────────────────────────────────
-- Separates "has the customer paid?" from "has stock been decremented?".
-- Without this, the event-claim lock is the only guard against double work.
-- With it, fulfill_order is idempotent even if the event record is lost.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (fulfillment_status IN ('pending', 'fulfilled'));

-- ── 3. Atomic fulfillment function ───────────────────────────────────────
-- Decrements stock for every order item and increments coupon usage
-- in a single transaction protected by a row-level lock on the order.
--
-- Returns:
--   'fulfilled'          — work was done in this call
--   'already_fulfilled'  — idempotent skip; a prior call already did it
--
-- Raises an exception on any error, causing the caller to roll back.
CREATE OR REPLACE FUNCTION fulfill_order(
  p_order_id    UUID,
  p_coupon_code TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fulfillment_status TEXT;
  v_item               RECORD;
BEGIN
  -- Lock the order row to serialise concurrent webhook deliveries.
  -- Any second call with the same order_id will block here until the
  -- first transaction commits, then see fulfillment_status = 'fulfilled'.
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

  -- Decrement stock for every order item
  FOR v_item IN
    SELECT variant_id, product_id, quantity
    FROM   order_items
    WHERE  order_id = p_order_id
  LOOP
    IF v_item.variant_id IS NOT NULL THEN
      UPDATE product_variants
      SET    stock      = GREATEST(0, stock - v_item.quantity),
             updated_at = NOW()
      WHERE  id = v_item.variant_id;
    ELSIF v_item.product_id IS NOT NULL THEN
      UPDATE products
      SET    stock      = GREATEST(0, stock - v_item.quantity),
             updated_at = NOW()
      WHERE  id = v_item.product_id;
    END IF;
  END LOOP;

  -- Increment coupon usage (no-op if the coupon has since been deleted)
  IF p_coupon_code IS NOT NULL THEN
    UPDATE coupons
    SET    uses_count = uses_count + 1,
           updated_at = NOW()
    WHERE  code = p_coupon_code;
  END IF;

  -- Mark the order as fulfilled
  UPDATE orders
  SET    fulfillment_status = 'fulfilled',
         updated_at         = NOW()
  WHERE  id = p_order_id;

  RETURN 'fulfilled';
END;
$$;
