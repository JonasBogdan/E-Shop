# Sprint 1 Security — Deployment Procedure

Branch: `sprint-1-security`  
Target: merge to `main` and deploy to production after all steps below pass.

---

## Prerequisites

- [ ] Supabase project backup taken (Dashboard → Settings → Backups, or `pg_dump`)
- [ ] Stripe webhook secret (`STRIPE_WEBHOOK_SECRET`) confirmed in Vercel production env vars
- [ ] Resend API key (`RESEND_API_KEY`) confirmed in Vercel production env vars
- [ ] No active checkout sessions in progress (wait for quiet period or warn in team channel)

---

## Step 1 — Validate in a preview/staging environment (recommended)

If you have a separate Supabase project for staging:

1. Apply all three migrations to the staging Supabase project (SQL Editor, in order):
   - `supabase/migrations/20240103_rls.sql`
   - `supabase/migrations/20240104_webhook_idempotency.sql`
2. Create a Vercel preview deployment pointing at the staging Supabase project  
   (set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in preview env vars).
3. Register the preview deployment's webhook URL in Stripe test-mode dashboard:  
   `https://<preview-url>/api/webhooks/stripe` → `checkout.session.completed` + `checkout.session.expired`
4. Place a test order through the preview UI using a Stripe test card.
5. Confirm in the staging Supabase `stripe_webhook_events` table:  
   `status = 'completed'` and `notifications_sent = true`.
6. Confirm order confirmation email arrives (check Resend test logs or inbox).

If you do not have a staging Supabase project, skip to Step 2 and proceed carefully.

---

## Step 2 — Apply database migrations to production

> **Why migrations first:** The new code references `stripe_webhook_events` and
> `fulfill_order()`. Deploying code before the migrations causes every Stripe
> webhook to fail with a 500 error until the migrations are applied.
> The migrations are purely additive — the old webhook code does not use any
> of the new tables or functions, so running them while the old code is deployed
> is safe.

Apply in order using the **Supabase SQL Editor** (production project):

### Migration 1 — RLS policies
```
supabase/migrations/20240103_rls.sql
```
Expected result: no errors; tables `orders`, `order_items`, `coupons`, `profiles` have RLS enabled.

### Migration 2 — Webhook idempotency + atomic fulfillment
```
supabase/migrations/20240104_webhook_idempotency.sql
```
Expected result: no errors; `stripe_webhook_events` table exists; `fulfill_order` function exists.

**Verify function permission (permissions check only — not a fulfillment test):**
```sql
-- Run as postgres role (Supabase SQL Editor default):
SELECT routine_name, privilege_type, grantee
FROM information_schema.role_routine_grants
WHERE routine_name = 'fulfill_order';
-- Must show a row: grantee='service_role', privilege_type='EXECUTE'.
-- If no row appears, the GRANT was not applied — re-run the migration.
```

```sql
-- Confirm the function raises a permission error as anon (not a syntax error):
-- This call intentionally raises "Order <uuid> not found" — that is correct.
-- A "permission denied" error instead means the GRANT is missing.
SELECT fulfill_order(gen_random_uuid(), null);
-- Expected: ERROR: Order <uuid> not found
-- NOT expected: ERROR: permission denied for function fulfill_order
```

---

## Step 3 — Deploy the new application code

1. Merge `sprint-1-security` → `main` via a pull request (review and approve first).
2. Vercel auto-deploys on push to `main`. Monitor the Vercel deployment log.
3. After deployment succeeds, confirm health:
   - Visit the shop homepage — it must load without errors.
   - Visit `/admin` — it must load and show the dashboard.

---

## Step 4 — Register webhook endpoint in Stripe (if URL changed)

If the production webhook URL changed, update it in the Stripe Dashboard:
- **Dashboard → Developers → Webhooks → production endpoint**
- Events: `checkout.session.completed`, `checkout.session.expired`
- The signing secret shown there must match `STRIPE_WEBHOOK_SECRET` in Vercel.

---

## Step 5 — Staging end-to-end test (before production)

Run this against the staging environment (Vercel preview + staging Supabase), using
Stripe test-mode keys and a Stripe test card (e.g. `4242 4242 4242 4242`).

**Before placing the test order — record baseline stock:**
```sql
-- Replace with the actual product or variant IDs you will order.
SELECT id, name_en, stock FROM products WHERE id = '<your-test-product-id>';
-- or for a variant:
SELECT id, name, stock FROM product_variants WHERE id = '<your-test-variant-id>';
-- If using a coupon:
SELECT code, uses_count FROM coupons WHERE code = '<your-test-coupon-code>';
```

**Place the test order** through the staging shop UI and complete payment.

**After the webhook fires — verify all six conditions:**

```sql
-- 1. Payment recorded and webhook event completed
SELECT o.id, o.status, o.fulfillment_status,
       e.status AS event_status, e.notifications_sent, e.completed_at
FROM orders o
JOIN stripe_webhook_events e ON e.order_id = o.id
ORDER BY o.created_at DESC LIMIT 1;
-- Expected: o.status='paid', o.fulfillment_status='fulfilled',
--           e.status='completed', e.notifications_sent=true,
--           e.completed_at IS NOT NULL
```

```sql
-- 2. Inventory decremented exactly once
SELECT id, name_en, stock FROM products WHERE id = '<your-test-product-id>';
-- Expected: stock = baseline_stock - ordered_quantity (exactly once)
```

```sql
-- 3. Coupon usage updated (skip if no coupon was used)
SELECT code, uses_count FROM coupons WHERE code = '<your-test-coupon-code>';
-- Expected: uses_count = baseline_uses_count + 1
```

**4. Emails received** — check the customer inbox for the confirmation email and
the admin inbox (`mesku.maistas@gmail.com`) for the new-order notification.

**5. Idempotency — replay the same Stripe event to confirm no double-decrement:**

In the Stripe test-mode Dashboard → Developers → Webhooks → select the
`checkout.session.completed` event → click **Resend**. Then re-run the stock query.

```sql
-- Stock must be unchanged from step 2 (no second decrement)
SELECT id, name_en, stock FROM products WHERE id = '<your-test-product-id>';

-- Webhook event must remain 'completed' (not reprocessed)
SELECT status, notifications_sent FROM stripe_webhook_events
WHERE order_id = (SELECT id FROM orders ORDER BY created_at DESC LIMIT 1);
-- Expected: status='completed' (unchanged), notifications_sent=true
```

---

## Step 6 — Smoke test with a live order (production)

After staging passes, repeat with a real payment in production:

1. Place a real order through the live shop using a low-cost item.
2. Complete payment with a real card.
3. Run the same SQL queries above against the production Supabase project.
4. Confirm customer confirmation email and admin notification email were received.

---

## Rollback procedure

If anything goes wrong after Step 3:

**Code rollback:** Revert the merge commit on `main` → Vercel redeploys the old code.

**Migration rollback** (only if needed — the old code does not use the new tables):
```sql
-- Remove RLS (run in Supabase SQL Editor as postgres):
REVOKE EXECUTE ON FUNCTION current_user_profile_role() FROM authenticated;
DROP FUNCTION IF EXISTS current_user_profile_role();
DROP POLICY IF EXISTS "users_read_own_orders"       ON orders;
DROP POLICY IF EXISTS "users_read_own_order_items"  ON order_items;
DROP POLICY IF EXISTS "users_read_own_profile"      ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile"    ON profiles;
ALTER TABLE orders      DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons     DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    DISABLE ROW LEVEL SECURITY;

-- Remove idempotency objects:
REVOKE ALL    ON FUNCTION fulfill_order(UUID, TEXT) FROM PUBLIC;
DROP FUNCTION IF EXISTS fulfill_order(UUID, TEXT);
DROP TABLE IF EXISTS stripe_webhook_events;
ALTER TABLE orders DROP COLUMN IF EXISTS fulfillment_status;
```

> Note: rolling back migrations while the new code is deployed will break
> webhooks. Always roll back code first, then migrations.
