import type {
  OrderStatus as ApiOrderStatus,
  PaymentStatusDto,
} from "@packages/types";
import type { OrderStatus, PaymentStatus } from "@prisma/client";

export const toApiOrderStatus = (status: OrderStatus): ApiOrderStatus => {
  switch (status) {
    case "PAID":
      return "paid";
    case "PENDING":
    default:
      return "pending";
  }
};

export const toApiPaymentStatus = (status: PaymentStatus): PaymentStatusDto => {
  switch (status) {
    case "PROCESSING":
      return "processing";
    case "SUCCEEDED":
      return "succeeded";
    case "CANCELED":
      return "canceled";
    case "FAILED":
      return "failed";
    case "REQUIRES_PAYMENT_METHOD":
    default:
      return "requires_payment_method";
  }
};

export const mapStripePaymentIntentStatus = (status: string): PaymentStatus => {
  switch (status) {
    case "processing":
      return "PROCESSING";
    case "succeeded":
      return "SUCCEEDED";
    case "canceled":
      return "CANCELED";
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
      return "REQUIRES_PAYMENT_METHOD";
    default:
      return "FAILED";
  }
};

export const stripeCurrency = (currency: "EUR" | "USD"): string =>
  currency.toLowerCase();
