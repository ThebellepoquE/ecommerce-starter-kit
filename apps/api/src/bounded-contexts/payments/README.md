# Payments

Contexto responsable de autorizaciones, capturas y conciliacion de pagos.

## Ownership

| Campo              | Valor                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| **Owner**          | `@ThebellepoquE`                                                                                      |
| **Rutas**          | `POST /orders/:orderId/payment-intent`, `POST /orders/:orderId/payment/sync`, `POST /webhooks/stripe` |
| **Implementación** | `apps/api/src/payments/`                                                                              |

Arquitectura global y reglas de documentacion: [ARCHITECTURE.md](../../../../../ARCHITECTURE.md) · [docs/DOCUMENTATION.md](../../../../../docs/DOCUMENTATION.md) · [OWNERS.md](../OWNERS.md).
