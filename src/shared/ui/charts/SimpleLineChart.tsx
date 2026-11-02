interface SimpleLineChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  fillColor?: string;
}

export default function SimpleLineChart({
  data,
  height = 200,
  color = '#B87333',
  fillColor = 'rgba(184, 115, 51, 0.1)',
}: SimpleLineChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;

  const chartHeight = height - 40;
  const chartWidth = 100;
  const pointSpacing = chartWidth / (data.length - 1 || 1);

  const points = data.map((item, index) => {
    const x = index * pointSpacing;
    const y = chartHeight - ((item.value - min) / range) * chartHeight;
    return { x, y, value: item.value, label: item.label };
  });

  const pathD = points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `${path} L ${point.x} ${point.y}`;
  }, '');

  const areaPathD = `${pathD} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full"
        style={{ height: `${height}px` }}
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: fillColor, stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: fillColor, stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        <path d={areaPathD} fill="url(#lineGradient)" />

        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="3"
              fill={color}
              className="hover:r-4 transition-all cursor-pointer"
            />
            <title>{`${point.label}: ${point.value}`}</title>
          </g>
        ))}

        {data.map((item, index) => {
          const point = points[index];
          if (!point) return null;
          return (
            <text
              key={index}
              x={point.x}
              y={height - 5}
              textAnchor="middle"
              className="text-xs fill-gray-600"
              style={{ fontSize: '10px' }}
            >
              {item.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
