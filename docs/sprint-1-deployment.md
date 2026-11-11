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
Expected result: no errors; `stripe_webhook_events` table exists; `fulfill_order` function exists and is callable with `SELECT fulfill_order(gen_random_uuid(), null);` returning an error about order not found (not a permission error).

**Verify function permission:**
```sql
-- Run as postgres role (SQL Editor default):
SELECT routine_name, privilege_type, grantee
FROM information_schema.role_routine_grants
WHERE routine_name = 'fulfill_order';
-- Should show service_role with EXECUTE.
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

## Step 5 — Smoke test with a live order

1. Place a real order through the shop using a low-cost item (or a test coupon for 100% off if available).
2. Complete payment with a real card in Stripe live mode.
3. Verify in Supabase:
   ```sql
   SELECT status, notifications_sent, completed_at
   FROM stripe_webhook_events
   ORDER BY created_at DESC LIMIT 5;
   -- Expect: status='completed', notifications_sent=true
   ```
4. Verify order `fulfillment_status = 'fulfilled'` in `orders` table.
5. Confirm customer confirmation email and admin notification email were received.

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
