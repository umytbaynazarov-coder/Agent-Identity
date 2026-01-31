import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BarChartProps {
  data: any[];
  xKey: string;
  bars: {
    dataKey: string;
    name: string;
    color: string;
  }[];
  height?: number;
  layout?: 'horizontal' | 'vertical';
}

export function BarChart({
  data,
  xKey,
  bars,
  height = 300,
  layout = 'horizontal',
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        {layout === 'horizontal' ? (
          <>
            <XAxis
              dataKey={xKey}
              className="text-xs text-gray-600 dark:text-gray-400"
              stroke="currentColor"
            />
            <YAxis
              className="text-xs text-gray-600 dark:text-gray-400"
              stroke="currentColor"
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              className="text-xs text-gray-600 dark:text-gray-400"
              stroke="currentColor"
            />
            <YAxis
              type="category"
              dataKey={xKey}
              className="text-xs text-gray-600 dark:text-gray-400"
              stroke="currentColor"
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#F3F4F6',
          }}
        />
        <Legend
          wrapperStyle={{
            paddingTop: '20px',
          }}
        />
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
