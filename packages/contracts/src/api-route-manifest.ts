/**
 * Rutas HTTP públicas implementadas en @apps/api (formato OpenAPI: `{param}`).
 * Actualizar este manifiesto y `openapi/v1/public-api.yaml` en el mismo PR al añadir endpoints.
 */
export type PublicApiRoute = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
};

export const IMPLEMENTED_PUBLIC_API_ROUTES = [
  { method: "GET", path: "/health" },
  { method: "GET", path: "/version" },
  { method: "GET", path: "/products" },
  { method: "POST", path: "/cart" },
  { method: "GET", path: "/cart/{cartId}" },
  { method: "POST", path: "/cart/{cartId}/items" },
  { method: "DELETE", path: "/cart/{cartId}/items/{productId}" },
  { method: "POST", path: "/orders" },
  { method: "GET", path: "/orders/{orderId}" },
  { method: "POST", path: "/orders/{orderId}/payment-intent" },
  { method: "POST", path: "/orders/{orderId}/payment/sync" },
  { method: "POST", path: "/webhooks/stripe" },
] as const satisfies readonly PublicApiRoute[];
