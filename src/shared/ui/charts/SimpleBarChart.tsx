interface SimpleBarChartProps {
  data: Array<{ label: string; value: number }>;
  maxValue?: number;
  height?: number;
  color?: string;
}

export default function SimpleBarChart({
  data,
  maxValue,
  height = 200,
  color = '#B87333',
}: SimpleBarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      <div className="flex items-end justify-between space-x-2" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const barHeight = (item.value / max) * (height - 40);

          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="relative w-full flex items-end justify-center">
                <div className="text-xs font-bold mb-1 text-gray-700">{item.value}</div>
              </div>
              <div
                className="w-full rounded-t-lg transition-all duration-300 hover:opacity-80"
                style={{
                  height: `${barHeight}px`,
                  backgroundColor: color,
                  minHeight: item.value > 0 ? '4px' : '0px',
                }}
              />
              <div className="mt-2 text-xs text-gray-600 text-center line-clamp-2 w-full">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
