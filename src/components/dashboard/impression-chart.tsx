'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ImpressionChartProps {
  data: { time: string; impressions: number }[]
}

export function ImpressionChart({ data }: ImpressionChartProps) {
  return (
    <div className="card p-6">
      <h3 className="text-sm font-medium text-ink-light mb-6">Impressions Over Time</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-ink-light text-sm">
          No data yet. Launch campaigns and enable traffic to see impressions.
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="impressionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="time"
                stroke="#475569"
                tick={{ fontSize: 11, fill: '#475569' }}
                tickFormatter={(v) => v.split('T')[1]?.split(':')[0] + 'h' || v}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#475569"
                tick={{ fontSize: 11, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                }}
                labelStyle={{ color: '#475569' }}
                itemStyle={{ color: '#2563EB' }}
              />
              <Area
                type="monotone"
                dataKey="impressions"
                stroke="#2563EB"
                strokeWidth={2}
                fill="url(#impressionGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#2563EB' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
