'use client'

import type { CampaignSummary } from '@/lib/types'

interface CampaignTableProps {
  campaigns: CampaignSummary[]
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'text-accent bg-accent-light border-accent/20',
  PAUSED: 'text-amber-600 bg-amber-50 border-amber-200',
  COMPLETED: 'text-ink-light bg-muted/50 border-muted',
}

function formatCurrency(n: number): string {
  return '$' + n.toFixed(2)
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-sm font-medium text-ink-light mb-4">Campaigns</h3>
        <div className="text-center py-12 text-ink-light text-sm">
          No campaigns yet.{' '}
          <a href="/campaign/new" className="text-accent hover:underline">
            Create your first campaign
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <h3 className="text-sm font-medium text-ink-light mb-4">Campaigns</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-muted">
              <th className="text-left py-3 px-2 text-ink-light font-medium">Name</th>
              <th className="text-left py-3 px-2 text-ink-light font-medium">Status</th>
              <th className="text-right py-3 px-2 text-ink-light font-medium">Budget</th>
              <th className="text-right py-3 px-2 text-ink-light font-medium">Spent</th>
              <th className="text-right py-3 px-2 text-ink-light font-medium">Impressions</th>
              <th className="text-right py-3 px-2 text-ink-light font-medium">VTR</th>
              <th className="text-right py-3 px-2 text-ink-light font-medium">Targeting</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const vtr = c.impressions > 0
                ? ((c.completions / c.impressions) * 100).toFixed(1) + '%'
                : '0%'
              return (
                <tr key={c.id} className="border-b border-muted hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2 font-medium text-ink">{c.name}</td>
                  <td className="py-3 px-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border ${STATUS_STYLES[c.status] || STATUS_STYLES.ACTIVE}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right text-ink-light">{formatCurrency(c.totalBudget)}</td>
                  <td className="py-3 px-2 text-right text-ink">{formatCurrency(c.spent)}</td>
                  <td className="py-3 px-2 text-right text-ink-light">{c.impressions}</td>
                  <td className="py-3 px-2 text-right text-accent">{vtr}</td>
                  <td className="py-3 px-2 text-right text-ink-light text-xs">
                    {[...c.genres, ...c.locations].slice(0, 2).join(', ')}
                    {[...c.genres, ...c.locations].length > 2 ? '...' : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
