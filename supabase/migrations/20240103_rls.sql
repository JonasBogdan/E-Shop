-- RLS policies for sensitive tables
-- ⚠️  REVIEW BEFORE APPLYING to production.
-- All server-side code uses the service role key (createAdminClient) which
-- bypasses RLS, so enabling these policies will NOT break any existing
-- API routes, webhooks, or admin pages.
--
-- Prerequisites: run as a database superuser (e.g. postgres role in Supabase SQL Editor).
--
-- Rollback script (run to undo):
--   REVOKE EXECUTE ON FUNCTION current_user_profile_role() FROM authenticated;
--   DROP FUNCTION IF EXISTS current_user_profile_role();
--   DROP POLICY IF EXISTS "users_read_own_orders"       ON orders;
--   DROP POLICY IF EXISTS "users_read_own_order_items"  ON order_items;
--   DROP POLICY IF EXISTS "users_read_own_profile"      ON profiles;
--   DROP POLICY IF EXISTS "users_update_own_profile"    ON profiles;
--   ALTER TABLE orders      DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE coupons     DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE profiles    DISABLE ROW LEVEL SECURITY;

-- ── Helper: read own role without recursive RLS evaluation ────────────────
-- WITH CHECK on profiles cannot query profiles directly — it causes recursive
-- RLS evaluation.  SECURITY DEFINER with an explicit search_path bypasses RLS
-- and prevents search_path injection.
-- Owned by the postgres superuser; only authenticated may call it.
CREATE OR REPLACE FUNCTION current_user_profile_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Remove the default PUBLIC execute privilege, then grant only to authenticated.
REVOKE ALL    ON FUNCTION current_user_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION current_user_profile_role() TO authenticated;

-- ── orders ────────────────────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Logged-in users can read their own orders (user_id matches).
-- Guest orders (user_id IS NULL) are only accessible via service role.
CREATE POLICY "users_read_own_orders" ON orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── order_items ───────────────────────────────────────────────────────────
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_order_items" ON order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- ── coupons ───────────────────────────────────────────────────────────────
-- Coupon codes must not be enumerable via the anon key.
-- Validation goes through /api/coupons/validate (server-side only).
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
-- No SELECT policy for anon or authenticated — service role bypasses this.

-- ── profiles ──────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile row
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile but cannot change their role.
-- current_user_profile_role() (SECURITY DEFINER) reads the existing role
-- without triggering recursive RLS evaluation on this table.
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = current_user_profile_role()
  );

-- ── stripe_webhook_events is covered in 20240104_webhook_idempotency.sql ──
