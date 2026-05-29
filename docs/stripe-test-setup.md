# Stripe en modo test (paso a paso)

Guía para probar pagos **de principio a fin** en local. Todo es **modo test**: no se cobra dinero real y no hace falta activar la cuenta para producción.

## Qué vas a conseguir

Flujo completo: catálogo → carrito → pedido → Payment Element → pedido `paid` vía webhook (o `payment/sync` como respaldo).

## Requisitos previos

- Monorepo arrancado con BD (Neon) y seed: ver [README.md](../README.md) pasos 1–5.
- Node **22**, pnpm **11.3.0**.
- Cuenta gratuita en [Stripe](https://dashboard.stripe.com/register).

---

## Paso 1 — Crear cuenta y activar modo Test

1. Regístrate en [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register).
2. En el Dashboard, arriba a la derecha, activa **Modo de prueba** (interruptor “Test mode”).
3. No necesitas completar el onboarding de producción para desarrollo local.

---

## Paso 2 — Obtener claves de API (test)

1. Ve a **Developers → API keys** ([enlace directo test](https://dashboard.stripe.com/test/apikeys)).
2. Copia:
   - **Publishable key** → empieza por `pk_test_...`
   - **Secret key** → empieza por `sk_test_...` (clic en “Reveal”)

⚠️ **Nunca** commitees la secret key. Solo va en `.env` local (gitignored).

---

## Paso 3 — Instalar Stripe CLI

La CLI reenvía webhooks de Stripe a tu API en `localhost`.

**Linux (ejemplo con apt/deb):** sigue [Install the Stripe CLI](https://docs.stripe.com/stripe-cli#install).

**Comprobar:**

```bash
stripe --version
stripe login
```

`stripe login` abre el navegador para autorizar la CLI con tu cuenta test.

---

## Paso 4 — Configurar variables de entorno

Copia el ejemplo y edita **`apps/api/.env`** (o `.env` en la raíz si ya lo usas para la API):

```bash
cp .env.example apps/api/.env
```

Completa al menos:

```env
DATABASE_URL=postgresql://...   # tu Neon EU

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # paso 5 — deja vacío hasta tenerlo
```

Storefront (opcional; la API también devuelve `publishableKey` en `payment-intent`):

```env
# apps/storefront/.env.local o variables en el shell
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Paso 5 — Webhook local con Stripe CLI

En **un terminal dedicado** (déjalo abierto mientras pruebas pagos):

```bash
stripe listen --forward-to localhost:4000/webhooks/stripe
```

La CLI imprime algo como:

```text
Ready! Your webhook signing secret is whsec_xxxxxxxx...
```

1. Copia ese `whsec_...` completo.
2. Pégalo en `apps/api/.env` como `STRIPE_WEBHOOK_SECRET`.
3. **Reinicia la API** (`pnpm --filter @apps/api dev` o `pnpm dev`) para que cargue el nuevo secret.

Sin este paso, el pago en el navegador puede completarse en Stripe pero la orden **no** pasará a `paid` en tu BD hasta que uses `payment/sync` (el storefront ya lo llama como respaldo).

---

## Paso 6 — Levantar la aplicación

Terminal 1 — API + storefront:

```bash
pnpm dev
```

Terminal 2 — Stripe listen (paso 5).

Comprueba:

```bash
curl -s http://localhost:4000/health
# {"status":"ok"}
```

---

## Paso 7 — Probar el flujo de compra

1. Abre [http://localhost:3000](http://localhost:3000).
2. Añade productos al carrito → **Ir al carrito** → **Confirmar pedido**.
3. En `/order/[orderId]` aparece el formulario de pago (Stripe Payment Element).
4. Usa tarjeta de prueba:

| Campo | Valor |
|-------|--------|
| Número | `4242 4242 4242 4242` |
| Fecha | Cualquier futura (ej. `12/34`) |
| CVC | Cualquier 3 dígitos (ej. `123`) |
| ZIP | Cualquiera |

5. Tras pagar, la página debería mostrar el pedido como **pagado** (`paid`).

---

## Paso 8 — Verificar en Stripe Dashboard

1. **Payments** → deberías ver un pago succeeded en modo test.
2. **Developers → Events** → eventos `payment_intent.succeeded` recibidos.
3. En tu BD: orden con estado `PAID` y fila en `Payment`.

---

## Tarjetas de prueba adicionales

Documentación oficial: [Testing](https://docs.stripe.com/testing).

| Escenario | Número |
|-----------|--------|
| Pago OK | `4242 4242 4242 4242` |
| Requiere autenticación (3DS) | `4000 0025 0000 3155` |
| Rechazada | `4000 0000 0000 9995` |

---

## Resolución de problemas

### `503 Stripe is not configured on the API`

Faltan `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` o `STRIPE_WEBHOOK_SECRET` en el entorno de la API. Reinicia la API tras editar `.env`.

### El pago “funciona” pero la orden sigue `pending`

- ¿Está corriendo `stripe listen`?
- ¿`STRIPE_WEBHOOK_SECRET` coincide con el `whsec_...` **actual** de la CLI? (cambia si reinicias listen)
- Recarga la página de orden: el storefront llama a `POST /orders/:id/payment/sync` como respaldo.

### Error de firma en webhook (`400`)

Secret incorrecto o cuerpo alterado. Usa el `whsec_` de la sesión activa de `stripe listen`, no el de un webhook creado en el Dashboard para otra URL.

### Payment Element no carga

- API en `:4000` accesible desde el navegador.
- Revisa consola del navegador y logs de Fastify.
- `NEXT_PUBLIC_API_URL=http://localhost:4000` en storefront.

---

## Modo live (producción) — no usar aún

- Claves `sk_live_` / `pk_live_` solo en **GitHub Environment** `production` o secretos del hosting.
- Webhook en URL **HTTPS** pública (no `localhost`).
- Activación de cuenta Stripe (KYC, banco) obligatoria.
- 3DS, impuestos y políticas legales de tu tienda.

---

## Referencias en el repo

- Implementación: `apps/api/src/payments/`
- UI: `apps/storefront/app/order/[orderId]/checkout-form.tsx`
- Arquitectura: [ARCHITECTURE.md — Pagos](../ARCHITECTURE.md#pagos-stripe)
- Variables: [.env.example](../.env.example)
