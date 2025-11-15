import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/stats - Incoming request");
    const searchParams = request.nextUrl.searchParams;
    const ageRange = searchParams.get("age_range");
    const region = searchParams.get("region");
    const incomeBracket = searchParams.get("income_bracket");

    // Build filter conditions for submissions
    let submissionsQuery = supabaseServer
      .from("submissions")
      .select("id");

    if (ageRange) {
      submissionsQuery = submissionsQuery.eq("age_range", ageRange);
    }
    if (region) {
      submissionsQuery = submissionsQuery.eq("region", region);
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

    const groupedByKey: Record<string, number[]> = {};
    for (const item of values) {
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

