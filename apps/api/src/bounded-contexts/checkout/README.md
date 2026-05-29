# Checkout

Contexto de orquestación del cierre de compra (carrito → pedido → pago en UI).

## Ownership

| Campo              | Valor                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| **Owner**          | `@ThebellepoquE`                                                            |
| **Rutas API**      | Ninguna dedicada; usa `orders` y `payments`                                 |
| **Implementación** | `apps/storefront/app/cart/page.tsx`, `apps/storefront/app/order/[orderId]/` |

Arquitectura global y reglas de documentacion: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md) · [docs/DOCUMENTATION.md](../../../../../docs/DOCUMENTATION.md) · [OWNERS.md](../OWNERS.md).
