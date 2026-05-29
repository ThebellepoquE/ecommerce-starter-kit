export const SLO_TARGETS = {
  latencyP95Ms: Number(process.env.SLO_LATENCY_P95_MS ?? "300"),
  maxErrorRate5xx: Number(process.env.SLO_MAX_ERROR_RATE_5XX ?? "0.01"),
  minAvailability: Number(process.env.SLO_MIN_AVAILABILITY ?? "0.995"),
} as const;

const MAX_SAMPLES_PER_ROUTE = 500;

type RouteBucket = {
  latenciesMs: number[];
  requests: number;
  errors5xx: number;
};

const globalLatenciesMs: number[] = [];
let globalRequests = 0;
let globalErrors5xx = 0;
const startedAt = Date.now();

const routeBuckets = new Map<string, RouteBucket>();

const getBucket = (key: string): RouteBucket => {
  let bucket = routeBuckets.get(key);
  if (!bucket) {
    bucket = { latenciesMs: [], requests: 0, errors5xx: 0 };
    routeBuckets.set(key, bucket);
  }
  return bucket;
};

const pushLatency = (bucket: RouteBucket, latencyMs: number): void => {
  bucket.latenciesMs.push(latencyMs);
  if (bucket.latenciesMs.length > MAX_SAMPLES_PER_ROUTE) {
    bucket.latenciesMs.shift();
  }
};

/** Agrupa URLs dinámicas (ids) para métricas por plantilla de ruta. */
export const normalizePathForMetrics = (url: string): string => {
  const path = url.split("?")[0] ?? url;
  return path
    .split("/")
    .map((segment) => {
      if (!segment) {
        return segment;
      }
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          segment,
        )
      ) {
        return ":id";
      }
      if (/^c[a-z0-9]{20,}$/i.test(segment)) {
        return ":id";
      }
      return segment;
    })
    .join("/");
};

export const recordHttpMetric = (
  method: string,
  routeTemplate: string,
  statusCode: number,
  latencyMs: number,
): void => {
  if (routeTemplate === "/metrics/slo") {
    return;
  }

  const key = `${method} ${routeTemplate}`;
  const bucket = getBucket(key);

  bucket.requests += 1;
  globalRequests += 1;

  pushLatency(bucket, latencyMs);
  globalLatenciesMs.push(latencyMs);
  if (globalLatenciesMs.length > MAX_SAMPLES_PER_ROUTE * 4) {
    globalLatenciesMs.shift();
  }

  if (statusCode >= 500) {
    bucket.errors5xx += 1;
    globalErrors5xx += 1;
  }
};

export const percentile = (values: number[], p: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
};

const latencySummary = (values: number[]) => ({
  p50: Math.round(percentile(values, 50) * 10) / 10,
  p95: Math.round(percentile(values, 95) * 10) / 10,
  p99: Math.round(percentile(values, 99) * 10) / 10,
  avg:
    values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) /
        10
      : 0,
  samples: values.length,
});

const errorRate = (errors: number, total: number): number =>
  total > 0 ? Math.round((errors / total) * 10000) / 10000 : 0;

const sloStatus = (
  p95Ms: number,
  rate5xx: number,
): { latencyP95: "ok" | "breach"; errorRate5xx: "ok" | "breach" } => ({
  latencyP95: p95Ms <= SLO_TARGETS.latencyP95Ms ? "ok" : "breach",
  errorRate5xx: rate5xx <= SLO_TARGETS.maxErrorRate5xx ? "ok" : "breach",
});

/** Reinicia contadores en memoria (tests). */
export const resetHttpMetricsForTests = (): void => {
  globalLatenciesMs.length = 0;
  globalRequests = 0;
  globalErrors5xx = 0;
  routeBuckets.clear();
};

export const buildSloDashboard = () => {
  const globalRate = errorRate(globalErrors5xx, globalRequests);
  const globalLatency = latencySummary(globalLatenciesMs);
  const uptimeMs = Date.now() - startedAt;

  const routes = [...routeBuckets.entries()]
    .map(([key, bucket]) => {
      const space = key.indexOf(" ");
      const method = key.slice(0, space);
      const route = key.slice(space + 1);
      const latency = latencySummary(bucket.latenciesMs);
      const rate = errorRate(bucket.errors5xx, bucket.requests);

      return {
        method,
        route,
        requests: bucket.requests,
        errors5xx: bucket.errors5xx,
        errorRate5xx: rate,
        latencyMs: latency,
        slo: sloStatus(latency.p95, rate),
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));

  const breachedRoutes = routes.filter(
    (r) => r.slo.latencyP95 === "breach" || r.slo.errorRate5xx === "breach",
  );

  const globalSlo = sloStatus(globalLatency.p95, globalRate);

  return {
    generatedAt: new Date().toISOString(),
    uptimeMs,
    documentation: "docs/slo-dashboard.md",
    slo: {
      latencyP95Ms: { target: SLO_TARGETS.latencyP95Ms, unit: "ms" },
      errorRate5xx: { target: SLO_TARGETS.maxErrorRate5xx },
      availability: { target: SLO_TARGETS.minAvailability },
    },
    global: {
      requests: globalRequests,
      errors5xx: globalErrors5xx,
      errorRate5xx: globalRate,
      latencyMs: globalLatency,
      slo: globalSlo,
      availabilityEstimate: globalRequests > 0 ? 1 - globalRate : 1,
    },
    routes,
    summary: {
      routesTracked: routes.length,
      routesBreachingSlo: breachedRoutes.length,
      overallHealthy:
        globalSlo.latencyP95 === "ok" &&
        globalSlo.errorRate5xx === "ok" &&
        breachedRoutes.length === 0,
    },
  };
};
