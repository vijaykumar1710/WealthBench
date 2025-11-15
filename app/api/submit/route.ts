import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { SubmissionPayload } from "@/types/submission";
import { calculateDerivedMetrics } from "@/lib/derivedMetrics";
import { validateSubmission } from "@/lib/validateSubmission";
import { logger } from "@/lib/logger";

// Helper to slugify names for keys
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

    // Insert into submissions table with required fixed fields
    const { data: submission, error: submissionError } = await supabaseServer
      .from("submissions")
      .insert({
        age_range: body.fixed.age_range,
        region: body.fixed.region,
        income_bracket: body.fixed.income_bracket,
        income: body.requiredFixed.income,
        savings: body.requiredFixed.savings,
        expenses: body.requiredFixed.expenses,
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
    const valuesToInsert: Array<{ submission_id: string; key: string; value: number }> = [];

    // Insert optional aggregates as direct keys
    if (body.optionalAggregates) {
      Object.entries(body.optionalAggregates).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          valuesToInsert.push({
            submission_id: submissionId,
            key,
            value,
          });
        }
      });
    }

    // Insert optional breakdown as namespaced keys
    if (body.optionalBreakdown) {
      // Stocks
      if (body.optionalBreakdown.stocks) {
        body.optionalBreakdown.stocks.forEach((stock) => {
          valuesToInsert.push({
            submission_id: submissionId,
            key: `stocks:${slugify(stock.name)}:value`,
            value: stock.value,
          });
        });
      }

      // Mutual Funds
      if (body.optionalBreakdown.mutual_funds) {
        body.optionalBreakdown.mutual_funds.forEach((fund) => {
          valuesToInsert.push({
            submission_id: submissionId,
            key: `mutual_funds:${slugify(fund.name)}:value`,
            value: fund.value,
          });
        });
      }

      // Cars
      if (body.optionalBreakdown.cars) {
        body.optionalBreakdown.cars.forEach((car) => {
          valuesToInsert.push({
            submission_id: submissionId,
            key: `cars:${slugify(car.name)}:value`,
            value: car.value,
          });
        });
      }

      // EMIs
      if (body.optionalBreakdown.emis) {
        body.optionalBreakdown.emis.forEach((emi) => {
          valuesToInsert.push({
            submission_id: submissionId,
            key: `emis:${slugify(emi.name)}:value`,
            value: emi.value,
          });
        });
      }

      // Real Estate
      if (body.optionalBreakdown.real_estate) {
        body.optionalBreakdown.real_estate.forEach((property, index) => {
          valuesToInsert.push({
            submission_id: submissionId,
            key: `real_estate:${index}:${slugify(property.location)}:price`,
            value: property.price,
          });
        });
      }
    }

    // Insert dynamic fields
    if (body.dynamic) {
      body.dynamic.forEach((field) => {
        valuesToInsert.push({
          submission_id: submissionId,
          key: field.key,
          value: field.value,
        });
      });
    }

    // Insert all values at once
    if (valuesToInsert.length > 0) {
      const { error: valuesError } = await supabaseServer
        .from("submission_values")
        .insert(valuesToInsert);

      if (valuesError) {
        return NextResponse.json(
          { success: false, error: valuesError.message },
          { status: 500 }
        );
      }
    }

    // Calculate derived metrics
    const derivedMetrics = calculateDerivedMetrics(
      body.requiredFixed,
      body.optionalAggregates,
      body.optionalBreakdown,
      body.dynamic || []
    );
    
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
    
    // Build redirect URL with key values for ranking
    const redirectParams = new URLSearchParams({
      submission_id: submissionId,
    });
    if (body.fixed.region) redirectParams.append("region", body.fixed.region);
    if (body.fixed.income_bracket) redirectParams.append("income_bracket", body.fixed.income_bracket);
    redirectParams.append("income", String(body.requiredFixed.income));
    redirectParams.append("savings", String(body.requiredFixed.savings));
    redirectParams.append("expenses", String(body.requiredFixed.expenses));
    
    // Add computed metrics
    const netWorth = derivedMetrics.find(m => m.key === "net_worth");
    const investmentValue = derivedMetrics.find(m => m.key === "investment_value");
    const realEstateTotal = derivedMetrics.find(m => m.key === "real_estate_total");
    const stockTotal = derivedMetrics.find(m => m.key === "stock_value_total");
    const mutualFundTotal = derivedMetrics.find(m => m.key === "mutual_fund_total");
    
    if (netWorth) redirectParams.append("net_worth", String(netWorth.value));
    if (investmentValue) redirectParams.append("investment_value", String(investmentValue.value));
    if (realEstateTotal) redirectParams.append("real_estate_total_price", String(realEstateTotal.value));
    if (stockTotal) redirectParams.append("stock_value_total", String(stockTotal.value));
    if (mutualFundTotal) redirectParams.append("mutual_fund_total", String(mutualFundTotal.value));
    
    const computed: Record<string, number> = {};
    derivedMetrics.forEach((m) => {
      computed[m.key] = m.value;
    });
    
    return NextResponse.json({
      success: true,
      submission_id: submissionId,
      derived_metrics: derivedMetrics.map((m) => m.key),
      computed,
      redirect_url: `/result?${redirectParams.toString()}`,
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
