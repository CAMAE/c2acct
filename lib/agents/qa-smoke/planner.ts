import type { RoutePlan } from "./types";

const ROUTES = [
  { route: "sign-in", path: "/sign-in" },
  { route: "health-db", path: "/api/health/db" },
  { route: "release-fingerprint", path: "/api/release-fingerprint" },
] as const;

/**
 * Planner step. Deterministic for Phase 1: probe all three core production
 * routes every run. This is the seam where a triage model could later subset or
 * prioritize routes (e.g. skip the heavy ones on a tight budget) — for a smoke
 * check, checking everything every hour is correct and cheap.
 */
export function planRoutes(baseUrl: string): RoutePlan[] {
  const base = baseUrl.replace(/\/+$/, "");
  return ROUTES.map((entry) => ({ route: entry.route, url: `${base}${entry.path}` }));
}
