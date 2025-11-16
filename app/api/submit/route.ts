import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";
import { SubmissionPayload, SubmissionResponse } from "@/types/submission";
import { validateSubmission } from "@/lib/validation";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { redis } from "@/lib/redis";
import { CACHE_KEYS } from "@/lib/cacheKeys";

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
    // Delete all metric snapshots
    const metricKeys = CACHE_KEYS.METRIC_LIST.map((m) =>
      CACHE_KEYS.metricSnapshotKey(m)
    );

    if (metricKeys.length > 0) {
      await redis.del(...metricKeys);
    }

    // Delete all dashboard caches using prefix scan
    const dashboardPrefix = CACHE_KEYS.dashboardPrefix();

    const scan = await redis.scan(0, {
      match: `${dashboardPrefix}*`,
      count: 1000,
    });

    const dashboardKeys = scan[1];

    if (dashboardKeys.length > 0) {
      await redis.del(...dashboardKeys);
    }

    logger.info("Redis caches invalidated successfully", {
      metric_count: metricKeys.length,
      dashboard_count: dashboardKeys.length,
    });
  } catch (err) {
    logger.warn("Redis invalidation failed", { err });
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
    invalidateRedisCaches(); // fire & forget (fast)

    const response: SubmissionResponse = {
      id: submission.id,
      created_at: submission.created_at,
      net_worth: submission.net_worth ?? 0,
    };

    logger.info("Submission created successfully", {
      submissionId: submission.id,
    });

    return NextResponse.json({ success: true, data: response });
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
