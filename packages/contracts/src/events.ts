export interface ProductUpdated {
  type: "ProductUpdated";
  payload: {
    productId: string;
    updatedFields: string[];
    occurredAt: string;
  };
}

export interface OrderPlaced {
  type: "OrderPlaced";
  payload: {
    orderId: string;
    customerId: string;
    totalCents: number;
    currency: "EUR" | "USD";
    occurredAt: string;
  };
}

export interface PaymentCaptured {
  type: "PaymentCaptured";
  payload: {
    paymentId: string;
    orderId: string;
    amountCents: number;
    currency: "EUR" | "USD";
    occurredAt: string;
  };
}

export type DomainEvent = ProductUpdated | OrderPlaced | PaymentCaptured;
