interface RankBadgeProps {
  percentile: number; // 0-100
}

export default function RankBadge({ percentile }: RankBadgeProps) {
  const getBadgeClass = () => {
    if (percentile >= 75) {
      return "bg-emerald-100 text-emerald-700";
    } else if (percentile >= 50) {
      return "bg-yellow-100 text-yellow-700";
    } else {
      return "bg-red-100 text-red-700";
    }
  };

  const getLabel = () => {
    if (percentile >= 75) {
      return "Excellent";
    } else if (percentile >= 50) {
      return "Average";
    } else {
      return "Below Average";
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBadgeClass()}`}>
      {getLabel()} ({percentile.toFixed(1)}%)
    </span>
  );
}

