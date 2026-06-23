'use client'

import { Input } from '@/components/ui/input'

interface StepOneProps {
  data: { name: string; dailyBudget: string; totalBudget: string }
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
}

export function StepOne({ data, errors, onChange }: StepOneProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink mb-1">Campaign Details</h2>
        <p className="text-ink-light text-sm">Set up the basics for your campaign.</p>
      </div>

      <Input
        label="Campaign Name"
        placeholder="e.g. Q3 Brand Awareness"
        value={data.name}
        onChange={(e) => onChange('name', e.target.value)}
        error={errors.name}
      />

      <Input
        label="Daily Budget ($)"
        type="number"
        placeholder="50"
        min={50}
        value={data.dailyBudget}
        onChange={(e) => onChange('dailyBudget', e.target.value)}
        error={errors.dailyBudget}
      />

      <Input
        label="Total Budget ($)"
        type="number"
        placeholder="1000"
        min={1}
        value={data.totalBudget}
        onChange={(e) => onChange('totalBudget', e.target.value)}
        error={errors.totalBudget}
      />
    </div>
  )
}
