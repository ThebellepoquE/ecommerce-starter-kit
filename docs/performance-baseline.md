# Baseline de rendimiento (API)

Documento de referencia para el hito del roadmap **Fase 1**: medir latencia, throughput y tasa de error en rutas críticas antes de optimizar o extraer servicios.

## Objetivos (roadmap)

| Métrica | Objetivo MVP (entorno de referencia) |
|---------|--------------------------------------|
| Latencia p95 | < 300 ms en `/products` y flujo carrito |
| Error rate 5xx / fallos | < 1 % en smoke/load básico |
| Disponibilidad | Comprobada vía `GET /health` (sintético / deploy) |

## Entorno de referencia

- **Node 22**, **pnpm 11.3.0**
- API local: `http://localhost:4000` (variable `PERF_BASE_URL`)
- PostgreSQL con datos seed (`pnpm --filter @apps/api seed`)
- Misma máquina que ejecuta el benchmark (no sustituye pruebas en staging/producción)

## Rutas incluidas en el script

| Ruta | Motivo |
|------|--------|
| `GET /health` | Sintético / disponibilidad |
| `GET /products` | Catálogo (lectura crítica) |
| `POST /cart` | Creación de carrito |
| `GET /cart/:cartId` | Lectura de carrito con ítems |

**Excluidas en v1:** `POST /orders` (consume carritos y requiere fixture por petición), pagos Stripe (`payment-intent`, webhooks). Añadir en una iteración posterior si hace falta.

## Cómo ejecutar

1. Migraciones y seed (si aún no lo hiciste):

   ```bash
   pnpm --filter @apps/api prisma:migrate
   pnpm --filter @apps/api seed
   ```

2. Levantar solo la API (en otro terminal):

   ```bash
   pnpm --filter @apps/api dev
   ```

3. Desde la raíz del monorepo:

   ```bash
   pnpm perf:baseline
   ```

4. (Opcional) Fallar si alguna ruta supera umbrales del roadmap:

   ```bash
   pnpm perf:baseline -- --assert
   ```

El script escribe `docs/performance-baseline.results.json` (gitignored). Copia una fila representativa en la tabla **Histórico** de este documento cuando actualices el baseline tras cambios relevantes.

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PERF_BASE_URL` | `http://localhost:4000` | URL base de la API |
| `PERF_DURATION_SEC` | `10` | Segundos por ruta |
| `PERF_CONNECTIONS` | `10` | Conexiones concurrentes (autocannon) |
| `PERF_P95_THRESHOLD_MS` | `300` | Umbral p95 (ms) |
| `PERF_MAX_ERROR_RATE` | `0.01` | Error rate máximo (1 %) |

## Interpretación

- **p95** en el script usa el percentil **p97.5** que expone autocannon (aproximación conservadora de p95).
- Picos en `POST /cart` son normales si la BD está en Neon remoto (latencia de red).
- Comparar siempre la misma URL, duración y conexiones entre ejecuciones.
- No ejecutar en CI contra `main` por defecto (depende de API + BD); usar en local o workflow manual futuro.

## Histórico (ejemplo)

Rellenar tras cada medición significativa (release, cambio de BD, refactor de rutas):

| Fecha | Commit / notas | GET /health p95 | GET /products p95 | POST /cart p95 | GET /cart p95 |
|-------|----------------|-----------------|-------------------|----------------|---------------|
| _pendiente_ | Primera captura local tras `pnpm perf:baseline` | — | — | — | — |

## Próximos pasos (roadmap)

- Dashboard mínimo de SLO (ítem 6).
- Prueba de carga corta con histórico versionado (ítem 7).
- Incluir `POST /orders` con generación de carritos en el runner si el equipo lo necesita.
