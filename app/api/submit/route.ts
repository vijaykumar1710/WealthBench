import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { SubmissionPayload } from "@/types/submission";
import { calculateDerivedMetrics } from "@/lib/derivedMetrics";

export async function POST(request: NextRequest) {
  try {
    const body: SubmissionPayload = await request.json();

    // Insert into submissions table
    const { data: submission, error: submissionError } = await supabaseServer
      .from("submissions")
      .insert({
        age_range: body.fixed.age_range,
        region: body.fixed.region,
        income_bracket: body.fixed.income_bracket,
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

    // Insert dynamic fields
    const dynamicFields = body.dynamic.map((field) => ({
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

    // Calculate and insert derived metrics
    const derivedMetrics = calculateDerivedMetrics(body.dynamic);
    if (derivedMetrics.length > 0) {
      const derivedFields = derivedMetrics.map((field) => ({
        submission_id: submissionId,
        key: field.key,
        value: field.value,
      }));

      const { error: derivedError } = await supabaseServer
        .from("submission_values")
        .insert(derivedFields);

      if (derivedError) {
        return NextResponse.json(
          { success: false, error: derivedError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      submission_id: submissionId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

