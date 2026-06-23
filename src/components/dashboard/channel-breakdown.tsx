'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ChannelBreakdownProps {
  data: { channel: string; impressions: number }[]
}

const CHANNEL_COLORS: Record<string, string> = {
  Hulu: '#2563EB',
  Peacock: '#7C3AED',
  Tubi: '#EF4444',
  Netflix: '#E50914',
  'Disney+': '#113CCF',
  'Paramount+': '#0064FF',
}

export function ChannelBreakdown({ data }: ChannelBreakdownProps) {
  return (
    <div className="card p-6">
      <h3 className="text-sm font-medium text-ink-light mb-6">Impressions by Channel</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-ink-light text-sm">
          No channel data yet.
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="channel"
                stroke="#475569"
                tick={{ fontSize: 11, fill: '#475569' }}
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
              <Bar dataKey="impressions" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={CHANNEL_COLORS[entry.channel] || '#94A3B8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
