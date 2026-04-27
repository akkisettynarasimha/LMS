export const defaultLeadStatuses = [
  'new',
  'contacted',
  'follow_up',
  'qualified',
  'proposal_sent',
  'negotiation',
  'done',
] as const

export type BuiltInLeadStatus = (typeof defaultLeadStatuses)[number]
export type LeadStatus = BuiltInLeadStatus | (string & {})

export type User = {
  id: string
  name: string
  email: string
  role: 'Super Admin' | 'Admin' | 'Manager' | 'Sales Executive' | 'Telecaller'
}

export type Lead = {
  _id: string
  name: string
  email: string
  status: LeadStatus
  source?: string
  assignedTo?: string
  createdAt: string
}

export type AppStats = {
  total: number
  newLeads: number
  converted: number
  contacted: number
  followUps: number
  lost: number
  conversionRate: string
}
