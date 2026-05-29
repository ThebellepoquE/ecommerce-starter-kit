import { describe, expect, it, beforeEach } from "vitest";
import {
  buildSloDashboard,
  normalizePathForMetrics,
  percentile,
  recordHttpMetric,
  resetHttpMetricsForTests,
  SLO_TARGETS,
} from "./http-metrics.js";

describe("http-metrics", () => {
  beforeEach(() => {
    resetHttpMetricsForTests();
  });
  it("normalizes uuid-like path segments", () => {
    expect(
      normalizePathForMetrics(
        "/cart/550e8400-e29b-41d4-a716-446655440000/items",
      ),
    ).toBe("/cart/:id/items");
  });

  it("computes percentiles", () => {
    const values = [10, 20, 30, 40, 100];
    expect(percentile(values, 50)).toBe(30);
    expect(percentile(values, 95)).toBe(100);
  });

  it("builds dashboard with slo breach when p95 exceeds target", () => {
    const slow = SLO_TARGETS.latencyP95Ms + 50;
    for (let i = 0; i < 20; i += 1) {
      recordHttpMetric("GET", "/products", 200, slow);
    }

    const dashboard = buildSloDashboard();
    const products = dashboard.routes.find((r) => r.route === "/products");
    expect(products?.slo.latencyP95).toBe("breach");
    expect(dashboard.summary.routesBreachingSlo).toBeGreaterThan(0);
  });
});
