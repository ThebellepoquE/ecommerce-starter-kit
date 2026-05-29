# Prueba de carga corta (sintética)

Complementa [performance-baseline.md](performance-baseline.md) con **más concurrencia y duración** para detectar degradación bajo presión moderada y documentar **señales** hacia los criterios de extracción del [roadmap](roadmap.md).

## ¿Tiene sentido sin clientes reales?

**Parcialmente.** Sin tráfico real no puedes validar capacidad de producción ni SLO de negocio. Aun así la prueba sintética sirve para:

- Comparar **antes/después** de un cambio (misma máquina, mismos parámetros).
- Ver si **Neon remoto** o un endpoint concreto se convierte en cuello de botella bajo carga.
- Generar datos para `pnpm slo:status` tras estresar la API en local.
- **No** justifica por sí sola extraer microservicios (hacen falta 2+ criterios durante ≥2 sprints con evidencia real).

| Herramienta | Cuándo usarla |
|-------------|----------------|
| `pnpm perf:baseline` | Smoke rápido (10 s, 10 conn) |
| `pnpm load:test` | Carga corta (30 s, 25 conn) + señales de extracción |
| `pnpm slo:status` | Snapshot **después** de tráfico (dev); no sustituye APM en prod |
| Dashboard SLO en prod | Cuando haya despliegue + tráfico real (Prometheus/Grafana, etc.) |

## Ejecutar

```bash
pnpm --filter @apps/api dev          # terminal 1
pnpm load:test                       # terminal 2
pnpm slo:status                      # opcional, tras la carga
```

Modo estricto (falla si p95 o error rate superan umbral):

```bash
pnpm load:test -- --assert
```

Salida JSON (gitignored): `docs/load-test.results.json`.

## Parámetros

| Variable | Default | Descripción |
|----------|---------|-------------|
| `LOAD_BASE_URL` | `http://localhost:4000` | API |
| `LOAD_DURATION_SEC` | `30` | Segundos por escenario |
| `LOAD_CONNECTIONS` | `25` | Conexiones concurrentes |
| `LOAD_P95_THRESHOLD_MS` | `300` | SLO p95 (ms) |
| `LOAD_MAX_ERROR_RATE` | `0.01` | Máx. error rate |
| `LOAD_THROUGHPUT_SKEW_RATIO` | `3` | Ratio RPS max/min para señal de desbalance |

## Señales de extracción (sintéticas)

El script evalúa señales alineadas con [ARCHITECTURE.md](../ARCHITECTURE.md) / roadmap:

| Señal | Condición |
|-------|-----------|
| `latency_slo_breach` | p95 > umbral en alguna ruta |
| `error_rate_breach` | error rate > 1 % |
| `throughput_skew` | RPS de una ruta de negocio ≥ 3× otra |

Si **≥ 2 señales** aparecen en la misma corrida, se marca `extractionReviewSuggested: true` — es un **recordatorio de revisión**, no una orden de extraer servicios.

Extracción real requiere además: evidencia sostenida, ownership/compliance, contratos y plan de rollback (roadmap).

## Histórico

| Fecha | Commit / notas | GET /products p95 | POST /cart p95 | Señales |
|-------|----------------|-------------------|----------------|---------|
| _pendiente_ | Primera corrida `pnpm load:test` | — | — | — |

## Relación con el dashboard SLO

El dashboard (`GET /metrics/slo`) acumula métricas **desde el arranque del proceso**. Tras `load:test`, `slo:status` refleja esa ventana — útil en desarrollo para ver qué rutas quedaron en `breach`.

En producción sin clientes, el dashboard in-memory **no aporta mucho** hasta que exista tráfico continuo o exportación a un sistema externo (ítem futuro).
