/**
 * AnalyticsPieChart - Pie/Donut chart component using Recharts
 */

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ChartDataPoint } from '@/types/analytics.types';

interface AnalyticsPieChartProps {
  data: ChartDataPoint[];
  title?: string;
  height?: number;
  donut?: boolean;
  showLegend?: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

export function AnalyticsPieChart({
  data,
  title,
  height = 300,
  donut = true,
  showLegend = true,
}: AnalyticsPieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Transform data to include index signature for Recharts
  const chartData = data.map((item, index) => ({
    ...item,
    fill: item.color ?? COLORS[index % COLORS.length],
  }));

  return (
    <div className="w-full">
      {title && <h3 className="mb-4 text-lg font-semibold text-foreground">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            innerRadius={donut ? 60 : 0}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="label"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${entry.label}`}
                fill={entry.fill ?? COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: number, name: string) => [
              `${value.toLocaleString('fr-FR')} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
              name,
            ]}
          />
          {showLegend && (
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value: string) => (
                <span style={{ color: 'hsl(var(--foreground))', fontSize: 12 }}>{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
