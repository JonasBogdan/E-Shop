-- RLS policies for sensitive tables
-- ⚠️  REVIEW BEFORE APPLYING to production.
-- All server-side code uses the service role key (createAdminClient) which
-- bypasses RLS, so enabling these policies will NOT break any existing
-- API routes, webhooks, or admin pages.
-- The anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is public, so without RLS
-- anyone can query orders and customer PII directly from the browser.

-- ── orders ────────────────────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Logged-in users can see their own orders only
CREATE POLICY "users_read_own_orders" ON orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Guest orders (user_id IS NULL) are not readable via anon/authenticated key
-- — they are only accessible through server-side service role.

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
-- Coupon codes must not be enumerable via the anon key (would expose all codes).
-- Validation goes through /api/coupons/validate (server-side only).
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
-- No SELECT policy for anon or authenticated — service role bypasses this.

-- ── profiles ──────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile but cannot change their own role
-- (prevents self-escalation to admin)
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );
