# Dashboard SLO mínimo (API)

Observabilidad ligera **en memoria** para el MVP: latencia p95, tasa de 5xx y disponibilidad estimada, alineada con [performance-baseline.md](performance-baseline.md) y Fase 1 del [roadmap](roadmap.md).

## Endpoint

```http
GET /metrics/slo
```

Respuesta JSON con:

- **Objetivos SLO** (`slo`): p95 &lt; 300 ms, error rate 5xx &lt; 1 %, disponibilidad objetivo 99.5 %
- **Global** (`global`): agregado desde el arranque del proceso API
- **Por ruta** (`routes`): plantilla Fastify (`/cart/:cartId`, `/products`, …)
- **Resumen** (`summary.overallHealthy`, `routesBreachingSlo`)

No forma parte del contrato OpenAPI v1 público (endpoint operativo interno).

## CLI

Con la API en marcha:

```bash
pnpm slo:status
pnpm slo:status -- --json
```

Variables: `SLO_BASE_URL` o `PERF_BASE_URL` (default `http://localhost:4000`).

## Variables de entorno (umbrales)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `SLO_LATENCY_P95_MS` | `300` | Umbral p95 (ms) |
| `SLO_MAX_ERROR_RATE_5XX` | `0.01` | Máximo ratio 5xx |
| `SLO_MIN_AVAILABILITY` | `0.995` | Objetivo documentado (99.5 %) |

## Cómo se recogen métricas

- Hook Fastify `onRequest` / `onResponse` en `apps/api/src/observability/`
- Muestras recientes por ruta (máx. 500 latencias por plantilla)
- Las peticiones a `/metrics/slo` no se contabilizan (evita sesgo)

## Limitaciones (MVP)

- **Se reinicia** al reiniciar el proceso (no hay persistencia).
- **No sustituye** Prometheus/Grafana ni APM en producción.
- p95 calculado sobre la ventana en memoria, no sobre 30 días.
- Complementa `pnpm perf:baseline` (carga sintética puntual) con visibilidad en tiempo real durante desarrollo.

## Flujo recomendado

1. `pnpm --filter @apps/api dev`
2. Tráfico normal o `pnpm perf:baseline`
3. `pnpm slo:status` o `curl -s localhost:4000/metrics/slo | jq`

## Próximo paso (roadmap ítem 7)

Prueba de carga corta versionada y umbrales de extracción a servicios dedicados.
