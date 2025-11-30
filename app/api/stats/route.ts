import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { loadMetricSnapshot } from "@/lib/stats/snapshots";
import { calculatePercentile } from "@/lib/stats/percentile";
import { allowedMetrics, RankingMetric } from "@/lib/stats/metrics";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const rawMetrics = body.metrics as Record<string, unknown> | undefined;
    if (!rawMetrics || typeof rawMetrics !== "object") {
      return NextResponse.json({ success: false, error: "No metrics provided" }, { status: 400 });
    }

    const metrics: Partial<Record<RankingMetric, number>> = {};
    for (const [k, v] of Object.entries(rawMetrics)) {
      if (!allowedMetrics.includes(k as RankingMetric)) continue;
      const numeric = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(numeric)) continue;
      metrics[k as RankingMetric] = numeric;
    }

    if (!Object.keys(metrics).length) {
      return NextResponse.json({ success: false, error: "No valid metrics provided" }, { status: 400 });
    }

    const region = typeof body.region === "string" ? body.region : "";
    const city = typeof body.city === "string" ? body.city : "";
    const occupation = typeof body.occupation === "string" ? body.occupation : "";
    const ageBucket = typeof body.age === "string" ? body.age : "";
    const yoe = typeof body.yoe === "string" ? body.yoe : "";

    const out: Record<string, any> = {};

    for (const metricKey of Object.keys(metrics) as RankingMetric[]) {
      const val = metrics[metricKey]!;
      const snapshot = await loadMetricSnapshot(metricKey);
      const sorted = (snapshot.values ?? []).slice().sort((a, b) => a - b);
      const percentile = calculatePercentile(sorted, val);

      // For cohort percentiles (city/occupation/age/yoe) we need rows; for now
      // we compute regional percentiles only if width exists in snapshot values (caller can later add filtered snapshots).
      // To keep behavior similar to before we just return the global percentile + placeholders.
      out[metricKey] = {
        value: val,
        percentile,
        city_percentile: null,
        occupation_percentile: null,
        age_percentile: null,
        yoe_percentile: null,
      };

      // Enhanced behavior could be added: load a filtered snapshot per city/occupation if provided and compute percentile.
      // That can be implemented later as an optional path (expensive if not cached).
    }

    return NextResponse.json({ success: true, data: out });
  } catch (err) {
    logger.error("Percentile route failed", { err });
    return NextResponse.json({ success: false, error: "Failed to compute percentiles" }, { status: 500 });
  }
}
