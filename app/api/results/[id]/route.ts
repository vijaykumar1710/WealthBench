import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";
import { Submission } from "@/types/submission";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<
  NextResponse<
    | { success: true; metrics: Record<string, number> }
    | { success: false; error: string }
  >
> {
  try {
    // ✅ FIX: unwrap params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing submission ID" },
        { status: 400 }
      );
    }

    // Fetch from Supabase
    const { data, error } = await supabaseServer
      .from("submissions")
      .select(
        `
        id,
        income_yearly,
        monthly_expenses,
        savings_total,
        net_worth,
        stock_value_total,
        mutual_fund_total,
        real_estate_total_price,
        gold_value_estimate,
        additional_metrics
        `
      )
      .eq("id", id)
      .single<Submission>();

    if (error || !data) {
      logger.error("Result fetch failed", { id, error });
      return NextResponse.json(
        { success: false, error: "Invalid or expired submission ID" },
        { status: 404 }
      );
    }

    // Prepare clean metrics
    const metrics: Record<string, number> = {
      income: data.income_yearly ?? 0,
      expenses: data.monthly_expenses ?? 0,
      savings: data.savings_total ?? 0,
      net_worth: data.net_worth ?? 0,
      stock_value_total: data.stock_value_total ?? 0,
      mutual_fund_total: data.mutual_fund_total ?? 0,
      real_estate_total_price: data.real_estate_total_price ?? 0,
      gold_value_estimate: data.gold_value_estimate ?? 0,
    };

    // Derived
    metrics["investment_value"] =
      (data.savings_total ?? 0) +
      (data.stock_value_total ?? 0) +
      (data.mutual_fund_total ?? 0) +
      (data.real_estate_total_price ?? 0) +
      (data.gold_value_estimate ?? 0);

    return NextResponse.json({ success: true, metrics });
  } catch (err) {
    logger.error("Result API error", { err });
    return NextResponse.json(
      { success: false, error: "Failed to load result" },
      { status: 500 }
    );
  }
}
