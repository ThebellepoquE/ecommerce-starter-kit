import { describe, expect, it } from "vitest";
import {
  mapStripePaymentIntentStatus,
  toApiOrderStatus,
  toApiPaymentStatus,
} from "./mappers.js";

describe("payment mappers", () => {
  it("maps prisma order status to API", () => {
    expect(toApiOrderStatus("PENDING")).toBe("pending");
    expect(toApiOrderStatus("PAID")).toBe("paid");
  });

  it("maps prisma payment status to API", () => {
    expect(toApiPaymentStatus("SUCCEEDED")).toBe("succeeded");
    expect(toApiPaymentStatus("REQUIRES_PAYMENT_METHOD")).toBe(
      "requires_payment_method",
    );
  });

  it("maps stripe payment intent status to prisma", () => {
    expect(mapStripePaymentIntentStatus("succeeded")).toBe("SUCCEEDED");
    expect(mapStripePaymentIntentStatus("processing")).toBe("PROCESSING");
    expect(mapStripePaymentIntentStatus("requires_action")).toBe(
      "REQUIRES_PAYMENT_METHOD",
    );
  });
});
