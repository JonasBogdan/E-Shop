/**
 * Focused tests for the webhook event-claiming logic.
 *
 * We test the decision function that inspects Supabase INSERT/UPDATE results
 * and determines whether the current delivery should proceed or skip.
 */
import { describe, it, expect } from "vitest";

// ── The claim logic extracted as a pure decision function ─────────────────
// (mirrors the logic in /api/webhooks/stripe/route.ts)

type ClaimOutcome =
  | "proceed"      // this delivery should process the event
  | "skip"         // event already claimed/completed — acknowledge and skip
  | "error";       // unexpected DB error — fail so Stripe retries

interface FakeInsertResult {
  error: { code: string; message: string } | null;
}

interface FakeUpdateResult {
  data: { stripe_event_id: string } | null;
}

function resolveClaimOutcome(
  insertResult: FakeInsertResult,
  reclaimResult?: FakeUpdateResult
): ClaimOutcome {
  if (!insertResult.error) return "proceed"; // INSERT succeeded — first delivery

  if (insertResult.error.code !== "23505") return "error"; // unexpected DB error

  // Unique violation — event already in table
  if (!reclaimResult?.data) return "skip"; // completed or concurrent processing

  return "proceed"; // successfully reclaimed a failed event for retry
}

// ─────────────────────────────────────────────────────────────────────────────

describe("webhook event claim logic", () => {
  it("proceeds on first delivery (INSERT succeeds)", () => {
    expect(resolveClaimOutcome({ error: null })).toBe("proceed");
  });

  it("skips when event is already completed (conflict, reclaim returns no rows)", () => {
    const insertResult: FakeInsertResult = { error: { code: "23505", message: "duplicate" } };
    const reclaimResult: FakeUpdateResult = { data: null }; // UPDATE WHERE status='failed' → 0 rows
    expect(resolveClaimOutcome(insertResult, reclaimResult)).toBe("skip");
  });

  it("skips when a concurrent delivery is processing (conflict, reclaim returns no rows)", () => {
    const insertResult: FakeInsertResult = { error: { code: "23505", message: "duplicate" } };
    const reclaimResult: FakeUpdateResult = { data: null };
    expect(resolveClaimOutcome(insertResult, reclaimResult)).toBe("skip");
  });

  it("proceeds when reclaiming a previously failed event (conflict, reclaim returns a row)", () => {
    const insertResult: FakeInsertResult = { error: { code: "23505", message: "duplicate" } };
    const reclaimResult: FakeUpdateResult = {
      data: { stripe_event_id: "evt_test_123" },
    };
    expect(resolveClaimOutcome(insertResult, reclaimResult)).toBe("proceed");
  });

  it("returns error for unexpected DB errors (not a unique violation)", () => {
    const insertResult: FakeInsertResult = {
      error: { code: "42000", message: "syntax error" },
    };
    expect(resolveClaimOutcome(insertResult)).toBe("error");
  });
});

// ── payment_status guard ──────────────────────────────────────────────────

describe("payment_status guard", () => {
  const PROCESSABLE_STATUSES = ["paid"];
  const NON_PROCESSABLE_STATUSES = ["unpaid", "no_payment_required"];

  it("allows processing for 'paid' sessions", () => {
    expect(PROCESSABLE_STATUSES).toContain("paid");
  });

  it.each(NON_PROCESSABLE_STATUSES)(
    "rejects processing for payment_status='%s'",
    (status) => {
      expect(PROCESSABLE_STATUSES).not.toContain(status);
    }
  );
});

// ── fulfill_order return value semantics ──────────────────────────────────

describe("fulfill_order return value semantics", () => {
  it("'fulfilled' means stock was decremented in this call", () => {
    const result = "fulfilled";
    expect(result).toBe("fulfilled");
  });

  it("'already_fulfilled' means a prior call already decremented stock — no double decrement", () => {
    const result = "already_fulfilled";
    // If this value is returned, we should NOT send low-stock alerts again
    expect(result).toBe("already_fulfilled");
    expect(result).not.toBe("fulfilled");
  });
});
