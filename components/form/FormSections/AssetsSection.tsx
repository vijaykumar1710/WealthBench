"use client";

type Props = {
  totalSavings: string;
  setTotalSavings: (v: string) => void;
  liabilitiesTotal: string;
  setLiabilitiesTotal: (v: string) => void;
  stockValue: string;
  setStockValue: (v: string) => void;
  mutualFundValue: string;
  setMutualFundValue: (v: string) => void;
  realEstateValue: string;
  setRealEstateValue: (v: string) => void;
  goldGrams: string;
  setGoldGrams: (v: string) => void;
  goldValue: string;
  setGoldValue: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  derivedGoldValue: number | null;
  derivedAssetsTotal: number;
  inputClass: string;
  labelClass: string;
};

export default function AssetsSection({
  totalSavings,
  setTotalSavings,
  liabilitiesTotal,
  setLiabilitiesTotal,
  stockValue,
  setStockValue,
  mutualFundValue,
  setMutualFundValue,
  realEstateValue,
  setRealEstateValue,
  goldGrams,
  setGoldGrams,
  goldValue,
  setGoldValue,
  notes,
  setNotes,
  derivedGoldValue,
  derivedAssetsTotal,
  inputClass,
  labelClass,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Total Savings (₹) *</label>
          <input
            type="number"
            value={totalSavings}
            onChange={(e) => setTotalSavings(e.target.value)}
            className={inputClass}
            inputMode="numeric"
          />
        </div>

        <div>
          <label className={labelClass}>Total Debt / Liabilities (₹) *</label>
          <input
            type="number"
            value={liabilitiesTotal}
            onChange={(e) => setLiabilitiesTotal(e.target.value)}
            className={inputClass}
            inputMode="numeric"
          />
        </div>

        <div>
          <label className={labelClass}>Stocks (₹)</label>
          <input
            type="number"
            value={stockValue}
            onChange={(e) => setStockValue(e.target.value)}
            className={inputClass}
            inputMode="numeric"
          />
        </div>

        <div>
          <label className={labelClass}>Mutual Funds (₹)</label>
          <input
            type="number"
            value={mutualFundValue}
            onChange={(e) => setMutualFundValue(e.target.value)}
            className={inputClass}
            inputMode="numeric"
          />
        </div>

        <div>
          <label className={labelClass}>Real Estate Value (₹) *</label>
          <input
            type="number"
            value={realEstateValue}
            onChange={(e) => setRealEstateValue(e.target.value)}
            className={inputClass}
            inputMode="numeric"
          />
        </div>

        <div>
          <label className={labelClass}>Gold (grams) *</label>
          <input
            type="number"
            value={goldGrams}
            onChange={(e) => setGoldGrams(e.target.value)}
            className={inputClass}
            inputMode="numeric"
          />
        </div>

        <div>
          <label className={labelClass}>Gold Value (₹)</label>
          <input
            type="number"
            value={goldValue}
            onChange={(e) => setGoldValue(e.target.value)}
            className={inputClass}
            inputMode="numeric"
            placeholder="Optional - auto-calculated from grams"
          />
          <p className="text-xs text-gray-500 mt-1">Derived gold value: {derivedGoldValue ? `₹${derivedGoldValue.toLocaleString()}` : "—"}</p>
        </div>
      </div>

      <div className="mt-3">
        <label className={labelClass}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputClass} min-h-[100px]`}
        />
        <p className="text-xs text-gray-500 mt-1">Optional — e.g. "I included EPF in savings", or "includes inherited property".</p>

        <div className="mt-2 text-sm text-gray-700">
          <strong>Assets total (derived):</strong> ₹{derivedAssetsTotal.toLocaleString()}
        </div>
      </div>
    </>
  );
}
