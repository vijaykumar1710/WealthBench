import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/stats - Incoming request");
    const searchParams = request.nextUrl.searchParams;
    const ageRange = searchParams.get("age_range");
    const location = searchParams.get("location"); // Changed from region to location
    const incomeBracket = searchParams.get("income_bracket");
    const metric = searchParams.get("metric");
    const value = searchParams.get("value");

    // If ranking is requested
    if (metric && value) {
      return await calculateRanking(metric, parseFloat(value), location || undefined, incomeBracket || undefined);
    }

    // Build filter conditions for submissions
    let submissionsQuery = supabaseServer
      .from("submissions")
      .select("*");

    if (ageRange) {
      submissionsQuery = submissionsQuery.eq("age_range", ageRange);
    }
    if (location) {
      submissionsQuery = submissionsQuery.eq("location", location); // Changed from region to location
    }
    if (incomeBracket) {
      submissionsQuery = submissionsQuery.eq("income_bracket", incomeBracket);
    }

    const { data: submissions, error: submissionsError } = await submissionsQuery;

    if (submissionsError) {
      logger.error("GET /api/stats - Error fetching submissions:", submissionsError);
      return NextResponse.json(
        { success: false, error: submissionsError.message },
        { status: 500 }
      );
    }

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({
        metrics: {},
      });
    }

    const submissionIds = submissions.map((s) => s.id);

    // Get fixed fields from submissions table
    const fixedFieldsMap: Record<string, number[]> = {};
    const fixedFieldKeys = [
      "income",
      "savings",
      "expenses",
    ];

    for (const sub of submissions) {
      for (const key of fixedFieldKeys) {
        const value = (sub as any)[key];
        if (value !== null && value !== undefined) {
          if (!fixedFieldsMap[key]) {
            fixedFieldsMap[key] = [];
          }
          fixedFieldsMap[key].push(value);
        }
      }
    }

    // Get all submission_values for these submissions
    const { data: values, error: valuesError } = await supabaseServer
      .from("submission_values")
      .select("key, value")
      .in("submission_id", submissionIds);

    if (valuesError) {
      logger.error("GET /api/stats - Error fetching values:", valuesError);
      return NextResponse.json(
        { success: false, error: valuesError.message },
        { status: 500 }
      );
    }

    if (!values || values.length === 0) {
      return NextResponse.json({
        metrics: {},
      });
    }

    // Group by key and calculate stats
    const metrics: Record<
      string,
      { sample_size: number; avg: number; p25: number; median: number; p75: number }
    > = {};

    // Merge fixed fields and dynamic values
    const groupedByKey: Record<string, number[]> = { ...fixedFieldsMap };
    for (const item of values || []) {
      if (!groupedByKey[item.key]) {
        groupedByKey[item.key] = [];
      }
      groupedByKey[item.key].push(item.value);
    }

    // Calculate stats for each key
    for (const [key, valuesArray] of Object.entries(groupedByKey)) {
      const sorted = [...valuesArray].sort((a, b) => a - b);
      const n = sorted.length;

      const avg = sorted.reduce((a, b) => a + b, 0) / n;
      const p25Index = Math.floor(n * 0.25);
      const medianIndex = Math.floor(n * 0.5);
      const p75Index = Math.floor(n * 0.75);

      metrics[key] = {
        sample_size: n,
        avg: Math.round(avg * 100) / 100,
        p25: sorted[p25Index],
        median: sorted[medianIndex],
        p75: sorted[p75Index],
      };
    }

    logger.info("GET /api/stats - Success, metrics computed for", Object.keys(metrics).length, "keys");
    return NextResponse.json({
      metrics,
    });
  } catch (error) {
    logger.error("GET /api/stats - Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

async function calculateRanking(
  metric: string,
  value: number,
  location?: string,
  incomeBracket?: string
) {
  try {
    // Get all submissions for global ranking
    const { data: allSubmissions } = await supabaseServer
      .from("submissions")
      .select("id, location, income_bracket");

    // Get location-specific submissions
    let locationSubmissions = allSubmissions;
    if (location) {
      locationSubmissions = allSubmissions?.filter((s) => s.location === location) || [];
    }

    // Get bracket-specific submissions
    let bracketSubmissions = allSubmissions;
    if (incomeBracket) {
      bracketSubmissions = allSubmissions?.filter((s) => s.income_bracket === incomeBracket) || [];
    }

    // Helper to get values for a metric from submissions
    const getMetricValues = async (submissionIds: string[]) => {
      const fixedFieldKeys: Record<string, string> = {
        income: "income",
        savings: "savings",
        expenses: "expenses",
        emi: "emi",
        gold: "gold",
        fixed_deposit: "fixed_deposit",
        car_value: "car_value",
        stock_value: "stock_value",
        crypto_value: "crypto_value",
        real_estate_price: "real_estate_price",
      };

      const values: number[] = [];

      // Check if it's a fixed field
      if (fixedFieldKeys[metric]) {
        const { data: subs } = await supabaseServer
          .from("submissions")
          .select(fixedFieldKeys[metric])
          .in("id", submissionIds);
        
        for (const sub of subs || []) {
          const val = (sub as any)[fixedFieldKeys[metric]];
          if (val !== null && val !== undefined) {
            values.push(val);
          }
        }
      } else {
        // Get from submission_values
        const { data: vals } = await supabaseServer
          .from("submission_values")
          .select("value")
          .in("submission_id", submissionIds)
          .eq("key", metric);
        
        for (const v of vals || []) {
          values.push(v.value);
        }
      }

      return values;
    };

    // Calculate percentile rank
    const calculatePercentile = (values: number[], targetValue: number): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const belowCount = sorted.filter((v) => v < targetValue).length;
      return (belowCount / sorted.length) * 100;
    };

    const allIds = allSubmissions?.map((s) => s.id) || [];
    const locationIds = locationSubmissions ? locationSubmissions.map((s) => s.id) : [];
    const bracketIds = bracketSubmissions ? bracketSubmissions.map((s) => s.id) : [];

    const globalValues = await getMetricValues(allIds);
    const locationSpecificValues = location ? await getMetricValues(locationIds) : globalValues;
    const bracketValues = incomeBracket ? await getMetricValues(bracketIds) : globalValues;

    const globalRank = calculatePercentile(globalValues, value);
    const locationRank = location ? calculatePercentile(locationSpecificValues, value) : null;
    const bracketRank = incomeBracket ? calculatePercentile(bracketValues, value) : null;

    return NextResponse.json({
      metric,
      value,
      percentile_rank: Math.round(globalRank * 100) / 100,
      location_rank: location ? Math.round(locationRank! * 100) / 100 : null,
      bracket_rank: incomeBracket ? Math.round(bracketRank! * 100) / 100 : null,
      global_rank: Math.round(globalRank * 100) / 100,
    });
  } catch (error) {
    logger.error("GET /api/stats - Ranking error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
