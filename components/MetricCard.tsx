interface MetricCardProps {
  title: string;
  sample_size: number;
  avg: number;
  p25: number;
  median: number;
  p75: number;
}

export default function MetricCard({
  title,
  sample_size,
  avg,
  p25,
  median,
  p75,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border p-4 shadow-sm bg-white">
      <h3 className="text-xl font-bold text-gray-800 mb-4 capitalize">{title}</h3>
      <div className="border-t border-gray-200 pt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Sample Size:</span>
          <span className="font-semibold text-gray-800">{sample_size}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Average:</span>
          <span className="font-semibold text-blue-600">{avg.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">25th Percentile (p25):</span>
          <span className="font-medium text-gray-700">{p25.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Median (p50):</span>
          <span className="font-semibold text-green-600">{median.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">75th Percentile (p75):</span>
          <span className="font-medium text-gray-700">{p75.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

