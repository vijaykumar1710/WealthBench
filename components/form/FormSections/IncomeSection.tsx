"use client";

type Props = {
  annualIncome: string;
  setAnnualIncome: (v: string) => void;
  inputClass: string;
  labelClass: string;
};

export default function IncomeSection({ annualIncome, setAnnualIncome, inputClass, labelClass }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <label className={labelClass}>Total Yearly Income (₹) *</label>
        <input
          type="number"
          inputMode="numeric"
          value={annualIncome}
          onChange={(e) => setAnnualIncome(e.target.value)}
          placeholder="e.g. 1200000"
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">Enter gross yearly income (approx.). Used to compute rates.</p>
      </div>
    </div>
  );
}
