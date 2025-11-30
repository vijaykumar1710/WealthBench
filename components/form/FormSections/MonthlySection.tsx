"use client";

type Props = {
  monthlySalary: string;
  setMonthlySalary: (v: string) => void;
  monthlyExpenses: string;
  setMonthlyExpenses: (v: string) => void;
  monthlySavings: string;
  setMonthlySavings: (v: string) => void;
  monthlyEmi: string;
  setMonthlyEmi: (v: string) => void;
  inputClass: string;
  labelClass: string;
};

export default function MonthlySection({
  monthlySalary,
  setMonthlySalary,
  monthlyExpenses,
  setMonthlyExpenses,
  monthlySavings,
  setMonthlySavings,
  monthlyEmi,
  setMonthlyEmi,
  inputClass,
  labelClass,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>Monthly In-hand (₹) *</label>
        <input
          type="number"
          value={monthlySalary}
          onChange={(e) => setMonthlySalary(e.target.value)}
          className={inputClass}
          inputMode="numeric"
        />
      </div>

      <div>
        <label className={labelClass}>Monthly Expenses (₹) *</label>
        <input
          type="number"
          value={monthlyExpenses}
          onChange={(e) => setMonthlyExpenses(e.target.value)}
          className={inputClass}
          inputMode="numeric"
        />
      </div>

      <div>
        <label className={labelClass}>Monthly Savings (₹)</label>
        <input
          type="number"
          value={monthlySavings}
          onChange={(e) => setMonthlySavings(e.target.value)}
          className={inputClass}
          inputMode="numeric"
        />
      </div>

      <div>
        <label className={labelClass}>Monthly EMI (₹)</label>
        <input
          type="number"
          value={monthlyEmi}
          onChange={(e) => setMonthlyEmi(e.target.value)}
          className={inputClass}
          inputMode="numeric"
        />
        <p className="text-xs text-gray-500 mt-1">EMI is NOT counted as liabilities in some stats; it's captured separately.</p>
      </div>
    </div>
  );
}
