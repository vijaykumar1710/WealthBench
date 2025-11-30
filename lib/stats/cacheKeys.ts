export const DEFAULTS = {
  METRIC_SNAPSHOT_TTL: 60 * 60, // 1 hour
  DASHBOARD_TTL: 24 * 60 * 60, // 24 hours
  SUBMISSIONS_SNAPSHOT_TTL: 60 * 60, // 1 hour
};

export const envOrDefault = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const TTL = {
  METRIC_SNAPSHOT: envOrDefault("METRIC_SNAPSHOT_TTL", DEFAULTS.METRIC_SNAPSHOT_TTL),
  DASHBOARD: envOrDefault("DASHBOARD_TTL", DEFAULTS.DASHBOARD_TTL),
  SUBMISSIONS_SNAPSHOT: envOrDefault("SUBMISSIONS_SNAPSHOT_TTL", DEFAULTS.SUBMISSIONS_SNAPSHOT_TTL),
};

export const CACHE_KEYS = {
  METRIC_SNAPSHOT_PREFIX: "metric_snapshot:",
  SUBMISSIONS_SNAPSHOT: "submissions_snapshot:all",
  DASHBOARD_PREFIX: "dashboard:",
  metricSnapshotKey(metric: string) {
    return `${this.METRIC_SNAPSHOT_PREFIX}${metric}`;
  },
  dashboardKey(filtersKey: string) {
    return `${this.DASHBOARD_PREFIX}${filtersKey}`;
  },
};
