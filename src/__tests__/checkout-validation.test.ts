import { describe, it, expect } from "vitest";
import {
  validateCheckoutBody,
  normalizeLocale,
  MAX_ITEM_QUANTITY,
} from "@/lib/checkout-validation";

const validCustomerInfo = {
  email: "test@example.com",
  name: "Jonas Bogdan",
  address: "Gedimino pr. 1",
  city: "Vilnius",
  postalCode: "01103",
};

describe("validateCheckoutBody", () => {
  it("accepts a well-formed request", () => {
    expect(
      validateCheckoutBody({
        items: [{ id: "uuid", quantity: 2 }],
        customerInfo: validCustomerInfo,
      })
    ).toBeNull();
  });

  it("rejects missing items", () => {
    expect(validateCheckoutBody({ items: [], customerInfo: validCustomerInfo })).not.toBeNull();
  });

  it("rejects non-array items", () => {
    expect(validateCheckoutBody({ items: "bad", customerInfo: validCustomerInfo })).not.toBeNull();
  });

  it("rejects quantity 0", () => {
    expect(
      validateCheckoutBody({
        items: [{ id: "uuid", quantity: 0 }],
        customerInfo: validCustomerInfo,
      })
    ).not.toBeNull();
  });

  it("rejects negative quantity", () => {
    expect(
      validateCheckoutBody({
        items: [{ id: "uuid", quantity: -1 }],
        customerInfo: validCustomerInfo,
      })
    ).not.toBeNull();
  });

  it("rejects fractional quantity", () => {
    expect(
      validateCheckoutBody({
        items: [{ id: "uuid", quantity: 1.5 }],
        customerInfo: validCustomerInfo,
      })
    ).not.toBeNull();
  });

  it(`rejects quantity above ${MAX_ITEM_QUANTITY}`, () => {
    expect(
      validateCheckoutBody({
        items: [{ id: "uuid", quantity: MAX_ITEM_QUANTITY + 1 }],
        customerInfo: validCustomerInfo,
      })
    ).not.toBeNull();
  });

  it(`accepts quantity exactly ${MAX_ITEM_QUANTITY}`, () => {
    expect(
      validateCheckoutBody({
        items: [{ id: "uuid", quantity: MAX_ITEM_QUANTITY }],
        customerInfo: validCustomerInfo,
      })
    ).toBeNull();
  });

  it("rejects missing customerInfo", () => {
    expect(
      validateCheckoutBody({ items: [{ id: "uuid", quantity: 1 }], customerInfo: null })
    ).not.toBeNull();
  });

  it("rejects customerInfo missing required field", () => {
    expect(
      validateCheckoutBody({
        items: [{ id: "uuid", quantity: 1 }],
        customerInfo: { ...validCustomerInfo, email: undefined },
      })
    ).not.toBeNull();
  });
});

describe("normalizeLocale", () => {
  it("passes through 'lt'", () => {
    expect(normalizeLocale("lt")).toBe("lt");
  });

  it("passes through 'en'", () => {
    expect(normalizeLocale("en")).toBe("en");
  });

  it("falls back to 'lt' for unknown locale", () => {
    expect(normalizeLocale("fr")).toBe("lt");
  });

  it("falls back to 'lt' for null", () => {
    expect(normalizeLocale(null)).toBe("lt");
  });

  it("falls back to 'lt' for undefined", () => {
    expect(normalizeLocale(undefined)).toBe("lt");
  });
});
