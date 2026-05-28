export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";
export type CartStatus = "active" | "ordered";
export type CurrencyCode = "EUR" | "USD";
export type PaymentStatusDto =
  | "requires_payment_method"
  | "processing"
  | "succeeded"
  | "canceled"
  | "failed";

export interface Product {
  id: string;
  name: string;
  priceCents: number;
  currency: CurrencyCode;
  inStock: boolean;
}

export interface ProductListItemDto {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  currency: CurrencyCode;
}

export interface CartItemDto {
  productId: string;
  productSlug: string;
  productTitle: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  currency: CurrencyCode;
}

export interface CartDto {
  id: string;
  status: CartStatus;
  items: CartItemDto[];
  totalItems: number;
  totalCents: number;
  currency: CurrencyCode;
  createdAt: string;
  updatedAt: string;
}

export interface AddCartItemRequestDto {
  productId: string;
  quantity: number;
}

export interface CreateOrderRequestDto {
  cartId: string;
}

export interface OrderItemDto {
  productId: string;
  productSlug: string;
  productTitle: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  currency: CurrencyCode;
}

export interface OrderPaymentDto {
  status: PaymentStatusDto;
  stripePaymentIntentId: string;
}

export interface OrderDto {
  id: string;
  cartId: string;
  status: OrderStatus;
  items: OrderItemDto[];
  totalItems: number;
  totalCents: number;
  currency: CurrencyCode;
  createdAt: string;
  updatedAt: string;
  payment: OrderPaymentDto | null;
}

export interface CreatePaymentIntentRequestDto {
  idempotencyKey?: string;
}

export interface CreatePaymentIntentResponseDto {
  clientSecret: string;
  paymentIntentId: string;
  publishableKey: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
}
