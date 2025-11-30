import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";
import { SubmissionPayload } from "@/types/submission";
import { validateSubmission } from "@/lib/validation";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { redis } from "@/lib/redis";
import { allowedMetrics } from "@/lib/stats/metrics";
import { revalidatePath } from "next/cache";
import { CACHE_KEYS } from "@/lib/stats/cacheKeys";

// ------------------------------------------
// RATE LIMITING
// ------------------------------------------
const isRedisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const ratelimit = isRedisConfigured
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "1 m"),
    })
  : null;

// ------------------------------------------
// REDIS CACHE INVALIDATION
// ------------------------------------------
async function invalidateRedisCaches() {
  try {
    // 1) Metric snapshot keys
    const metricKeys = allowedMetrics.map((m: string) =>
      CACHE_KEYS.metricSnapshotKey(m)
    );

    if (metricKeys.length > 0) {
      try {
        await redis.del(...metricKeys);
      } catch (err) {
        // if deleting many keys at once fails for any reason, delete individually
        logger.warn("Bulk redis.del failed for metricKeys, attempting per-key", { err });
        for (const k of metricKeys) {
          try {
            await redis.del(k);
          } catch (e) {
            logger.warn("redis.del metric key failed", { key: k, e });
          }
        }
      }
    }

    // 2) Submissions snapshot key
    const submissionsKey = CACHE_KEYS.SUBMISSIONS_SNAPSHOT;
    try {
      await redis.del(submissionsKey);
    } catch (err) {
      logger.warn("redis.del submissions snapshot failed", { key: submissionsKey, err });
    }

    // 3) dashboard:* keys using scan loop (Upstash returns cursor as string)
    const dashboardPrefix = CACHE_KEYS.DASHBOARD_PREFIX;
    const deletedDashboardKeys: string[] = [];
    let cursor = "0";
    do {
      // scan returns [cursor:string, keys:string[]]
      const res = await redis.scan(cursor, { match: `${dashboardPrefix}*`, count: 1000 });
      cursor = res[0];
      const keys = res[1] ?? [];
      if (keys.length > 0) {
        try {
          await redis.del(...keys);
          deletedDashboardKeys.push(...keys);
        } catch (err) {
          logger.warn("redis.del dashboard keys batch failed, deleting individually", { keysLength: keys.length, err });
          for (const k of keys) {
            try {
              await redis.del(k);
              deletedDashboardKeys.push(k);
            } catch (e) {
              logger.warn("redis.del single dashboard key failed", { key: k, e });
            }
          }
        }
      }
    } while (cursor !== "0");

    logger.info("Redis caches invalidated successfully", {
      metric_count: metricKeys.length,
      dashboard_count: deletedDashboardKeys.length,
    });

    return { metric_count: metricKeys.length, dashboard_count: deletedDashboardKeys.length };
  } catch (err) {
    logger.warn("Redis invalidation failed", { err });
    return { metric_count: 0, dashboard_count: 0, error: String(err) };
  }
}

// ------------------------------------------
// MAIN POST HANDLER
// ------------------------------------------
export async function POST(request: NextRequest) {
  try {
    if (ratelimit) {
      const identifier =
        request.headers.get("x-real-ip") ??
        request.headers.get("x-forwarded-for") ??
        "127.0.0.1";

      const { success } = await ratelimit.limit(identifier);
      if (!success) {
        return NextResponse.json(
          { success: false, error: "Too many requests" },
          { status: 429 }
        );
      }
    }

    const body: SubmissionPayload = await request.json();

    const validation = validateSubmission({
      demographics: body.demographics,
      financials: body.financials,
    });

    if (!validation.success) {
      logger.warn("Validation failed", { errors: validation.errors });
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const { demographics, financials, additional_metrics = {} } = body;

    // ------------------------------------------
    // COMPUTED FIELDS
    // ------------------------------------------
    const inferredAssetsTotal =
      (financials.savings_total ?? 0) +
      (financials.real_estate_total_price ?? 0) +
      (financials.gold_value_estimate ?? 0) +
      (financials.stock_value_total ?? 0) +
      (financials.mutual_fund_total ?? 0);

    financials.assets_total =
      typeof financials.assets_total === "number"
        ? financials.assets_total
        : inferredAssetsTotal;

    const net_worth =
      (financials.assets_total ?? 0) -
      (financials.liabilities_total ?? 0);

    const savings_rate =
      financials.income_yearly > 0
        ? (financials.savings_total / financials.income_yearly) * 100
        : 0;

    // ------------------------------------------
    // INSERT INTO SUPABASE
    // ------------------------------------------
    const { data: submission, error: submissionError } = await supabaseServer
      .from("submissions")
      .insert({
        // Demographics
        age: demographics.age,
        city: demographics.city,
        country: demographics.country,
        location: demographics.location,
        yoe: demographics.yoe,
        occupation: demographics.occupation,

        // Financials
        income_yearly: financials.income_yearly,
        monthly_expenses: financials.monthly_expenses,
        savings_total: financials.savings_total,
        liabilities_total: financials.liabilities_total,
        assets_total: financials.assets_total,
        net_worth,

        stock_value_total: financials.stock_value_total,
        mutual_fund_total: financials.mutual_fund_total,
        real_estate_total_price: financials.real_estate_total_price,
        gold_grams: financials.gold_grams,
        gold_value_estimate: financials.gold_value_estimate,

        additional_metrics: {
          ...additional_metrics,
          savings_rate,
          investments: financials.investments,
          real_estate: financials.real_estate,
          vehicles: financials.vehicles,
          other_assets: financials.other_assets,
          other_liabilities: financials.other_liabilities,
        },
      })
      .select()
      .single();

    if (submissionError || !submission) {
      logger.error("Error creating submission", {
        error: submissionError,
        submission,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create submission",
          ...(process.env.NODE_ENV === "development" && {
            details: submissionError?.message,
          }),
        },
        { status: 500 }
      );
    }

    // ------------------------------------------
    // REDIS: invalidate caches after successful INSERT
    // ------------------------------------------
    // Fire-and-forget background invalidation + revalidate path
    void (async () => {
      try {
        const result = await invalidateRedisCaches();
        try {
          // revalidate the dashboard page so it picks up the new cached API payload
          revalidatePath("/dashboard");
          logger.info("revalidatePath('/dashboard') called", { result });
        } catch (e) {
          logger.warn("revalidatePath failed", { e });
        }
      } catch (e) {
        logger.warn("background cache invalidation failed", { e });
      }
    })();

    logger.info("Submission created successfully", {
      submissionId: submission.id,
    });

    // ------------------------------------------
    // RETURN FULL METRICS FOR REDIRECT
    // ------------------------------------------
    const metricsForResultPage = {
      income: financials.income_yearly ?? 0,
      expenses: financials.monthly_expenses ?? 0,
      savings: financials.savings_total ?? 0,
      net_worth,
      stock_value_total: financials.stock_value_total ?? 0,
      mutual_fund_total: financials.mutual_fund_total ?? 0,
      real_estate_total_price: financials.real_estate_total_price ?? 0,
      gold_value_estimate: financials.gold_value_estimate ?? 0,
      investment_value:
        (financials.savings_total ?? 0) +
        (financials.stock_value_total ?? 0) +
        (financials.mutual_fund_total ?? 0) +
        (financials.real_estate_total_price ?? 0) +
        (financials.gold_value_estimate ?? 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        submission_id: submission.id,
        metrics: metricsForResultPage,
      },
    });
  } catch (error) {
    logger.error("Error in submit endpoint", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while processing your submission",
        ...(process.env.NODE_ENV === "development" && {
          details:
            error instanceof Error ? error.message : "Unknown error",
        }),
      },
      { status: 500 }
    );
  }
}
