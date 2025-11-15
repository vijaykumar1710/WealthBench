import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { SubmissionPayload } from "@/types/submission";
import { calculateDerivedMetrics } from "@/lib/derivedMetrics";
import { validateSubmission } from "@/lib/validateSubmission";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/submit - Incoming request");
    const body: SubmissionPayload = await request.json();

    // Validate submission
    const validationErrors = validateSubmission(body);
    if (validationErrors.length > 0) {
      logger.error("POST /api/submit - Validation errors:", validationErrors);
      return NextResponse.json(
        { success: false, error: "Validation failed", errors: validationErrors },
        { status: 400 }
      );
    }

    // Filter out fixed fields from dynamic fields to avoid duplicates
    const fixedFieldKeys = [
      "income",
      "savings",
      "expenses",
      "emi",
      "gold",
      "fixed_deposit",
      "car_value",
      "stock_value",
      "crypto_value",
      "real_estate_price",
    ];
    const filteredDynamic = body.dynamic.filter(
      (field) => !fixedFieldKeys.includes(field.key.toLowerCase())
    );

    // Insert into submissions table with all fixed fields
    const { data: submission, error: submissionError } = await supabaseServer
      .from("submissions")
      .insert({
        age_range: body.fixed.age_range,
        region: body.fixed.region,
        income_bracket: body.fixed.income_bracket,
        income: body.fixed.income,
        savings: body.fixed.savings,
        expenses: body.fixed.expenses,
        emi: body.fixed.emi,
        gold: body.fixed.gold,
        fixed_deposit: body.fixed.fixed_deposit,
        car_value: body.fixed.car_value,
        stock_value: body.fixed.stock_value,
        crypto_value: body.fixed.crypto_value,
        real_estate_region: body.fixed.real_estate_region,
        real_estate_price: body.fixed.real_estate_price,
      })
      .select()
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { success: false, error: submissionError?.message || "Failed to create submission" },
        { status: 500 }
      );
    }

    const submissionId = submission.id;

    // Insert filtered dynamic fields (excluding fixed fields)
    if (filteredDynamic.length > 0) {
      const dynamicFields = filteredDynamic.map((field) => ({
        submission_id: submissionId,
        key: field.key,
        value: field.value,
      }));

      const { error: dynamicError } = await supabaseServer
        .from("submission_values")
        .insert(dynamicFields);

      if (dynamicError) {
        return NextResponse.json(
          { success: false, error: dynamicError.message },
          { status: 500 }
        );
      }
    }

    // Calculate and insert derived metrics using fixed fields and dynamic fields
    const derivedMetrics = calculateDerivedMetrics(body.fixed, filteredDynamic);
    if (derivedMetrics.length > 0) {
      logger.info("POST /api/submit - Derived metrics computed:", derivedMetrics.map(m => m.key));
      const derivedFields = derivedMetrics.map((field) => ({
        submission_id: submissionId,
        key: field.key,
        value: field.value,
      }));

      const { error: derivedError } = await supabaseServer
        .from("submission_values")
        .insert(derivedFields);

      if (derivedError) {
        logger.error("POST /api/submit - Error inserting derived metrics:", derivedError);
        return NextResponse.json(
          { success: false, error: derivedError.message },
          { status: 500 }
        );
      }
    }

    logger.info("POST /api/submit - Success, submission_id:", submissionId);
    return NextResponse.json({
      success: true,
      submission_id: submissionId,
      derived_metrics: derivedMetrics.map((m) => m.key),
    });
  } catch (error) {
    logger.error("POST /api/submit - Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

