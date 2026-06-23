'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
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

function generateCurveData(budget: number) {
  return Array.from({ length: 11 }, (_, i) => {
    const b = (budget / 10) * i
    const reach = Math.round(b * 45 * (1 + Math.sin((i / 10) * Math.PI) * 0.3))
    return { budget: b, reach }
  })
}

export function GrowthMatrix() {
  const [budget, setBudget] = useState(5000)
  const data = generateCurveData(budget)

  const totalReach = Math.round(budget * 45)
  const frequency = 3.2
  const effectiveReach = Math.round(totalReach / frequency)

  return (
    <section className="py-12 relative bg-canvas">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <div className="badge justify-center mb-4">Growth Projections</div>
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-3">
            Predict Your <span className="text-gradient">Audience Reach</span>
          </h2>
          <p className="text-ink-light max-w-xl mx-auto">
            Adjust your budget to see how spend impacts audience reach across CTV inventory.
          </p>
        </motion.div>

        <div className="card p-8">
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="budget"
                      stroke="#475569"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#475569"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
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
                      formatter={(value: number) => [`${value.toLocaleString()} people`, 'Reach']}
                      labelFormatter={(v) => `Budget: $${v.toLocaleString()}`}
                    />
                    <Bar dataKey="reach" radius={[4, 4, 0, 0]} maxBarSize={32} fill="#2563EB">
                      {data.map((_, index) => (
                        <Cell key={index} fill={index % 2 === 0 ? '#2563EB' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="text-sm font-medium text-ink-light mb-2 block">
                  Monthly Budget: <span className="text-ink font-bold">${budget.toLocaleString()}</span>
                </label>
                <input
                  type="range"
                  min={500}
                  max={50000}
                  step={500}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-ink-light/60 mt-1">
                  <span>$500</span>
                  <span>$50k</span>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Total Population Reach', value: totalReach.toLocaleString(), sub: 'Budget × 45 impressions', color: 'text-accent' },
                  { label: 'Est. Frequency Multiplier', value: `${frequency}×`, sub: 'Average exposure window', color: 'text-success' },
                  { label: 'Effective Unique Reach', value: effectiveReach.toLocaleString(), sub: 'After frequency adjustment', color: 'text-ink' },
                ].map((metric, i) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card p-4"
                  >
                    <div className="text-xs text-ink-light mb-0.5">{metric.label}</div>
                    <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
                    <div className="text-[11px] text-ink-light/60 mt-0.5">{metric.sub}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
