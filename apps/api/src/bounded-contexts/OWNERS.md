# Ownership por bounded context

Tabla de referencia para PRs y revisiones. En un equipo pequeño un mismo maintainer puede cubrir varios contextos; al crecer, asignar owners distintos por fila.

| Contexto   | Owner (GitHub)   | Rutas HTTP (v1)                                        | Código de implementación                              |
| ---------- | ---------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| `catalog`  | `@ThebellepoquE` | `GET /products`                                        | `apps/api/src/catalog/`                               |
| `cart`     | `@ThebellepoquE` | `POST /cart`, `GET /cart/:cartId`, `POST/DELETE` ítems | `apps/api/src/cart/`                                  |
| `orders`   | `@ThebellepoquE` | `POST /orders`, `GET /orders/:orderId`                 | `apps/api/src/orders/`                                |
| `checkout` | `@ThebellepoquE` | (orquestación en storefront)                           | `apps/storefront/app/cart/`, `app/order/`             |
| `payments` | `@ThebellepoquE` | `payment-intent`, `payment/sync`, `/webhooks/stripe`   | `apps/api/src/payments/`                              |
| `identity` | _sin asignar_    | —                                                      | `bounded-contexts/identity/` (placeholder)            |
| Infra HTTP | `@ThebellepoquE` | `GET /health`, `GET /version`, `GET /metrics/slo`      | `apps/api/src/system/`, `apps/api/src/observability/` |

**Reglas**

- Cambios que cruzan contextos (p. ej. orden que marca carrito `ORDERED`) requieren review del owner de cada contexto afectado o del maintainer del monorepo.
- Actualizar esta tabla y el `README.md` del contexto si cambia ownership o rutas.
- Contrato público: `packages/contracts/openapi/v1/public-api.yaml` + `api-route-manifest.ts`.
