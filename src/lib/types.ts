export interface CampaignFormData {
  name: string
  dailyBudget: number
  totalBudget: number
  genres: string[]
  locations: string[]
  videoUrl: string
}

export interface DashboardData {
  totalBudget: number
  totalSpent: number
  activeCampaigns: number
  vtr: number
  impressionsOverTime: { time: string; impressions: number }[]
  channelBreakdown: { channel: string; impressions: number }[]
  campaigns: CampaignSummary[]
}

export interface CampaignSummary {
  id: string
  name: string
  status: string
  dailyBudget: number
  totalBudget: number
  spent: number
  genres: string[]
  locations: string[]
  videoUrl: string | null
  impressions: number
  completions: number
  createdAt: string
}

export interface SimulatorTickResult {
  bids: number
  matched: number
  impressions: number
}

export type EventType =
  | 'IMPRESSION'
  | 'COMPLETED_25'
  | 'COMPLETED_50'
  | 'COMPLETED_75'
  | 'COMPLETED_100'
