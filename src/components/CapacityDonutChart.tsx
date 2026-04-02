import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DonutSegment {
  name: string;
  value: number;
  color: string;
}

interface CapacityDonutChartProps {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
  size?: number;
}

export default function CapacityDonutChart({ segments, centerLabel, centerValue, size = 220 }: CapacityDonutChartProps) {
  const validSegments = segments.filter(s => s.value > 0);

  if (validSegments.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: size }}>
        <p className="text-sm text-exp-gray-400">No capacity to display</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={validSegments}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.32}
              outerRadius={size * 0.45}
              paddingAngle={1}
              dataKey="value"
              stroke="none"
            >
              {validSegments.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-exp-gray-400">{centerLabel}</span>
          <span className="text-lg font-bold text-exp-black">{centerValue}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {validSegments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <div>
              <p className="text-xs text-exp-gray-500">{segment.name}</p>
              <p className="text-sm font-semibold text-exp-black">{segment.value.toFixed(2)} TiB</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
