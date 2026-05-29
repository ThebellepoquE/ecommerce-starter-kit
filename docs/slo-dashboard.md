# Dashboard SLO mínimo (API)

Observabilidad ligera **en memoria** para el MVP: latencia p95, tasa de 5xx y disponibilidad estimada, alineada con [performance-baseline.md](performance-baseline.md) y Fase 1 del [roadmap](roadmap.md).

## ¿Es prematuro sin clientes reales?

**Para producción, sí.** Sin tráfico continuo ni usuarios, un SLO “oficial” no se puede medir ni incumplir de forma meaningful.

**Para desarrollo, tiene sentido limitado:**

- Ver el efecto de `pnpm perf:baseline` o `pnpm load:test` en `pnpm slo:status`.
- Detectar regresiones obvias (p95 disparado, 5xx) mientras iteras en local.
- Familiarizar el equipo con el shape de métricas antes de conectar Prometheus/Grafana.

No sustituye APM ni error budgets en prod. Cuando haya despliegue y clientes, planear exportación persistente o sustituir este endpoint por observabilidad real.

Ver también [load-test.md](load-test.md) (carga sintética vs tráfico real).

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
- Complementa `pnpm perf:baseline` (smoke) y `pnpm load:test` (carga corta); ver [docs/load-test.md](docs/load-test.md).

## Flujo recomendado

1. `pnpm --filter @apps/api dev`
2. Tráfico normal o `pnpm perf:baseline`
3. `pnpm slo:status` o `curl -s localhost:4000/metrics/slo | jq`

## Próximo paso (roadmap ítem 7)

Prueba de carga corta versionada y umbrales de extracción a servicios dedicados.
