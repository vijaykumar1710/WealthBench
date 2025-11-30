import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

import { allowedMetrics } from "@/lib/stats/metrics";
import { CACHE_KEYS } from "@/lib/stats/cacheKeys";
import { loadMetricSnapshot } from "@/lib/stats/snapshots";

export async function GET(req: NextRequest) {
  try {
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";

    // ---------------------------------------------------
    // 1) SIMPLE REDIS TEST PATH
    // ---------------------------------------------------
    if (!refresh) {
      const now = new Date().toISOString();
      await redis.set("wb:test", now, { ex: 60 });
      const value = await redis.get("wb:test");

      return NextResponse.json({
        ok: true,
        message: "Redis working!",
        value,
      });
    }

    // ---------------------------------------------------
    // 2) FULL REFRESH PATH
    // ---------------------------------------------------
    const deletedKeys: string[] = [];

    /* ---------------------------------------------------
       Clear metric snapshot:* keys
    --------------------------------------------------- */
    for (const metric of allowedMetrics) {
      const key = CACHE_KEYS.metricSnapshotKey(metric);
      await redis.del(key);
      deletedKeys.push(key);
    }

    /* ---------------------------------------------------
       Clear submissions snapshot
    --------------------------------------------------- */
    await redis.del(CACHE_KEYS.SUBMISSIONS_SNAPSHOT);
    deletedKeys.push(CACHE_KEYS.SUBMISSIONS_SNAPSHOT);

    /* ---------------------------------------------------
       Clear dashboard:* keys using SCAN
    --------------------------------------------------- */
    let cursor: string = "0";
    do {
      const res = await redis.scan(cursor, {
        match: `${CACHE_KEYS.DASHBOARD_PREFIX}*`,
        count: 100,
      });

      cursor = res[0];
      const keys = res[1];

      if (keys.length > 0) {
        await redis.del(...keys);
        deletedKeys.push(...keys);
      }
    } while (cursor !== '0');

    /* ---------------------------------------------------
       Rebuild all metric snapshots
       loadMetricSnapshot() auto-fetches from DB + caches
    --------------------------------------------------- */
    for (const metric of allowedMetrics) {
      await loadMetricSnapshot(metric);
    }

    return NextResponse.json({
      ok: true,
      message: "All snapshots & dashboard caches refreshed.",
      deleted: deletedKeys,
      rebuilt_metrics: allowedMetrics,
    });
  } catch (err: any) {
    logger.error("redis-test-refresh-error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to refresh snapshots",
        details: err?.message,
      },
      { status: 500 }
    );
  }
}
