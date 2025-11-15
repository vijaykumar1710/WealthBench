interface PercentileBarProps {
  value: number; // 0-100
}

export default function PercentileBar({ value }: PercentileBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}

