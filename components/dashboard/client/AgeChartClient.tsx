"use client";

import IncomeByAgeChart from "../charts/IncomeByAgeChart";

export default function AgeChartClient({ data }: any) {
  return <IncomeByAgeChart data={data} />;
}
