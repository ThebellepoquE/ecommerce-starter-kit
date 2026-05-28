export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export interface Product {
  id: string;
  name: string;
  priceCents: number;
  currency: "EUR" | "USD";
  inStock: boolean;
}

export interface ProductListItemDto {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  currency: "EUR" | "USD";
}

export interface User {
  id: string;
  email: string;
  displayName: string;
}
