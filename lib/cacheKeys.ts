export const CACHE_KEYS = {
  METRIC_SNAPSHOT_PREFIX: "metric_snapshot:",
  DASHBOARD_PREFIX: "dashboard:",

  // List all metrics used in metric snapshots
  METRIC_LIST: [
    "income",
    "savings",
    "expenses",
    "net_worth",
    "investment_value",
    "stock_value_total",
    "mutual_fund_total",
    "real_estate_total_price",
    "gold_value_estimate",
  ],

  /** return full snapshot key name */
  metricSnapshotKey(metric: string) {
    return `${this.METRIC_SNAPSHOT_PREFIX}${metric}`;
  },

  /** return prefix for all dashboards */
  dashboardPrefix() {
    return this.DASHBOARD_PREFIX;
  }
};
