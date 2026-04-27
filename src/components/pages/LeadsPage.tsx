import { useEffect, useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import { leadSourceOptions } from '../../shared/crmData'
import { getSessionUser } from '../../shared/accessControl'
import { defaultLeadStatuses } from '../../shared/crmTypes'
import type { Lead, LeadStatus, User } from '../../shared/crmTypes'

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const customStageStorageKey = 'curator-custom-lead-stages'
const stageOrderStorageKey = 'curator-lead-stage-order'
const hiddenStageStorageKey = 'curator-hidden-lead-stages'
const stageAccentClasses = [
  'accent-blue',
  'accent-cyan',
  'accent-amber',
  'accent-indigo',
  'accent-violet',
  'accent-green',
]

const normalizeLeadStatus = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

const formatLeadStatusLabel = (status: string) =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

function KanbanColumn({
  title,
  count,
  cards,
  accent,
  empty,
  muted,
  dropStatus,
  isDropActive,
  onCardDragStart,
  onCardClick,
  onColumnDrop,
  onColumnDragOver,
  onStageDragStart,
  onStageDragEnd,
  isStageDropActive,
  canRemoveStage,
  onRemoveStage,
  removing,
}: {
  title: string
  count: number
  cards: { id: string; name: string; owner: string; value: string; tone: 'Hot' | 'Warm' | 'Cold'; time: string }[]
  accent: string
  empty?: boolean
  muted?: boolean
  dropStatus?: LeadStatus
  isDropActive?: boolean
  onCardDragStart?: (event: DragEvent<HTMLDivElement>, leadId: string) => void
  onCardClick?: (leadId: string) => void
  onColumnDrop?: (event: DragEvent<HTMLElement>, nextStatus: LeadStatus) => Promise<void>
  onColumnDragOver?: (event: DragEvent<HTMLElement>, nextStatus: LeadStatus) => void
  onStageDragStart?: (event: DragEvent<HTMLButtonElement>, status: LeadStatus) => void
  onStageDragEnd?: () => void
  isStageDropActive?: boolean
  canRemoveStage?: boolean
  onRemoveStage?: (status: LeadStatus) => Promise<void>
  removing?: boolean
}) {
  const droppableProps =
    dropStatus && onColumnDrop && onColumnDragOver
      ? {
          onDrop: (event: DragEvent<HTMLElement>) => {
            void onColumnDrop(event, dropStatus)
          },
          onDragOver: (event: DragEvent<HTMLElement>) => onColumnDragOver(event, dropStatus),
        }
      : {}

  return (
    <article className={`kanban-col ${isDropActive ? 'drop-active' : ''} ${isStageDropActive ? 'drop-active' : ''}`} {...droppableProps}>
      <div className="kanban-head">
        <div>
          <span className={`dot ${accent}`}></span>
          <h3>{title}</h3>
          <span className="count">{count}</span>
        </div>
        <div className="kanban-head-actions">
          {dropStatus ? (
            <button
              type="button"
              className="square-btn"
              draggable
              onDragStart={(event) => onStageDragStart?.(event, dropStatus)}
              onDragEnd={onStageDragEnd}
              title="Drag to reorder stage"
              aria-label="Drag to reorder stage"
            >
              <span className="material-symbols-outlined">drag_indicator</span>
            </button>
          ) : null}
          {dropStatus && canRemoveStage ? (
            <button
              type="button"
              className="square-btn"
              onClick={() => {
                if (onRemoveStage) {
                  void onRemoveStage(dropStatus)
                }
              }}
              title="Remove stage"
              aria-label="Remove stage"
              disabled={Boolean(removing)}
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          ) : null}
          <button type="button">
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        </div>
      </div>

      {empty ? (
        <div className="kanban-empty">
          <span className="material-symbols-outlined">move_to_inbox</span>
          <span>Drop here</span>
        </div>
      ) : (
        <div className="kanban-cards">
          {cards.map((card) => (
            <div
              className={`kanban-card ${muted ? 'muted' : ''}`}
              key={card.id}
              draggable={Boolean(dropStatus && onCardDragStart)}
              role="button"
              tabIndex={0}
              onClick={() => onCardClick?.(card.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onCardClick?.(card.id)
                }
              }}
              onDragStart={
                onCardDragStart
                  ? (event) => onCardDragStart(event, card.id)
                  : undefined
              }
              onDragEnd={() => {
                if (dropStatus) {
                  // no-op: drag state is handled in LeadsPage drop callbacks
                }
              }}
            >
              <div className="card-top">
                <span className={`pill ${card.tone.toLowerCase()}`}>{card.tone}</span>
                <span>{card.time}</span>
              </div>
              <h4>{card.name}</h4>
              <p>{card.owner}</p>
              <div className="card-bottom">
                <div>
                  <span className="material-symbols-outlined">payments</span>
                  {card.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

export type LeadsPageProps = {
  leads: Lead[]
  onMoveLead: (leadId: string, nextStatus: LeadStatus) => Promise<void>
  onAssignLead: (leadId: string, userId: string | null) => Promise<void>
  users: User[]
  searchQuery: string
  onBulkUpload?: () => void
  onDownloadTemplate?: () => void
}

export function LeadsPage({ leads, onMoveLead, onAssignLead, users, searchQuery, onBulkUpload, onDownloadTemplate }: LeadsPageProps) {
  type DateRangeFilter = '7' | '30' | '90' | 'all' | 'custom'

  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeFilter>('30')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [customFromDate, setCustomFromDate] = useState('')
  const [customToDate, setCustomToDate] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [newStageName, setNewStageName] = useState('')
  const [draggedStageStatus, setDraggedStageStatus] = useState<LeadStatus | null>(null)
  const [stageDropTargetStatus, setStageDropTargetStatus] = useState<LeadStatus | null>(null)
  const [removingStageStatus, setRemovingStageStatus] = useState<LeadStatus | null>(null)
  const [hiddenStages, setHiddenStages] = useState<LeadStatus[]>(() => {
    try {
      const raw = localStorage.getItem(hiddenStageStorageKey)
      if (!raw) {
        return []
      }

      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        return []
      }

      return parsed.map((item) => normalizeLeadStatus(String(item || ''))).filter((item): item is LeadStatus => Boolean(item))
    } catch {
      return []
    }
  })
  const [customStages, setCustomStages] = useState<LeadStatus[]>(() => {
    try {
      const raw = localStorage.getItem(customStageStorageKey)
      if (!raw) {
        return []
      }

      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        return []
      }

      return parsed
        .map((item) => normalizeLeadStatus(String(item || '')))
        .filter((item): item is LeadStatus => Boolean(item) && !defaultLeadStatuses.includes(item as (typeof defaultLeadStatuses)[number]))
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(customStageStorageKey, JSON.stringify(customStages))
  }, [customStages])

  useEffect(() => {
    localStorage.setItem(hiddenStageStorageKey, JSON.stringify(hiddenStages))
  }, [hiddenStages])

  const [stageOrder, setStageOrder] = useState<LeadStatus[]>(() => {
    try {
      const raw = localStorage.getItem(stageOrderStorageKey)
      if (!raw) {
        return []
      }

      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        return []
      }

      return parsed.map((item) => normalizeLeadStatus(String(item || ''))).filter((item): item is LeadStatus => Boolean(item))
    } catch {
      return []
    }
  })

  const dateFilteredLeads = useMemo(() => {
    if (dateRange === 'custom') {
      const fromTs = customFromDate ? new Date(`${customFromDate}T00:00:00`).getTime() : null
      const toTs = customToDate ? new Date(`${customToDate}T23:59:59`).getTime() : null

      if (!fromTs && !toTs) {
        return leads
      }

      return leads.filter((lead) => {
        const createdAtTs = new Date(lead.createdAt).getTime()
        if (!Number.isFinite(createdAtTs)) {
          return false
        }

        if (fromTs && createdAtTs < fromTs) {
          return false
        }

        if (toTs && createdAtTs > toTs) {
          return false
        }

        return true
      })
    }

    if (dateRange === 'all') {
      return leads
    }

    const days = Number(dateRange)
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000

    return leads.filter((lead) => {
      const createdAtTs = new Date(lead.createdAt).getTime()
      return Number.isFinite(createdAtTs) && createdAtTs >= cutoff
    })
  }, [customFromDate, customToDate, dateRange, leads])

  const sourceFilteredLeads = useMemo(() => {
    if (sourceFilter === 'all') {
      return dateFilteredLeads
    }

    return dateFilteredLeads.filter((lead) => (lead.source || '').trim().toLowerCase() === sourceFilter)
  }, [dateFilteredLeads, sourceFilter])

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) {
      return sourceFilteredLeads
    }

    const query = searchQuery.trim().toLowerCase()
    return sourceFilteredLeads.filter((lead) => {
      const doesNameMatch = lead.name.toLowerCase().includes(query)
      const doesEmailMatch = lead.email.toLowerCase().includes(query)
      return doesNameMatch || doesEmailMatch
    })
  }, [searchQuery, sourceFilteredLeads])

  const detectedStages = useMemo(() => {
    const extras = new Set<LeadStatus>()
    filteredLeads.forEach((lead) => {
      const normalizedStatus = normalizeLeadStatus(String(lead.status || '')) as LeadStatus
      if (!normalizedStatus) {
        return
      }

      if (!defaultLeadStatuses.includes(normalizedStatus as (typeof defaultLeadStatuses)[number])) {
        extras.add(normalizedStatus)
      }
    })

    return Array.from(extras)
  }, [filteredLeads])

  const knownStages = useMemo(() => {
    const set = new Set<LeadStatus>(defaultLeadStatuses)
    customStages.forEach((status) => set.add(status))
    detectedStages.forEach((status) => set.add(status))
    return Array.from(set).filter((status) => !hiddenStages.includes(status))
  }, [customStages, detectedStages, hiddenStages])

  useEffect(() => {
    setStageOrder((current) => {
      const currentSet = new Set(current)
      const knownSet = new Set(knownStages)

      const kept = current.filter((status) => knownSet.has(status))
      const missing = knownStages.filter((status) => !currentSet.has(status))
      return [...kept, ...missing]
    })
  }, [knownStages])

  useEffect(() => {
    localStorage.setItem(stageOrderStorageKey, JSON.stringify(stageOrder))
  }, [stageOrder])

  const grouped = useMemo(() => {
    const groups: Record<string, Lead[]> = {}

    stageOrder.forEach((status) => {
      groups[status] = []
    })

    filteredLeads.forEach((lead) => {
      const status = normalizeLeadStatus(String(lead.status || '')) || 'new'
      if (!groups[status]) {
        groups[status] = []
      }
      groups[status].push(lead)
    })

    return groups
  }, [filteredLeads, stageOrder])

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) {
      return null
    }

    return leads.find((lead) => lead._id === selectedLeadId) || null
  }, [leads, selectedLeadId])

  const formatLeadDate = (value: string) => {
    const parsed = new Date(value)
    if (!Number.isFinite(parsed.getTime())) {
      return 'N/A'
    }

    return parsed.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const onCardDragStart = (event: DragEvent<HTMLDivElement>, leadId: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', leadId)
    event.dataTransfer.setData('application/x-curator-drag-kind', 'lead')
    setDraggedStageStatus(null)
    setStageDropTargetStatus(null)
    setDraggedLeadId(leadId)
  }

  const onColumnDragOver = (event: DragEvent<HTMLElement>, status: LeadStatus) => {
    event.preventDefault()
    if (draggedStageStatus) {
      setStageDropTargetStatus(status)
      return
    }
    setDragOverStatus(status)
  }

  const onStageDragStart = (event: DragEvent<HTMLButtonElement>, status: LeadStatus) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-curator-drag-kind', 'stage')
    event.dataTransfer.setData('application/x-curator-stage', status)
    setDraggedStageStatus(status)
    setStageDropTargetStatus(null)
    setDraggedLeadId(null)
    setDragOverStatus(null)
  }

  const onStageDragEnd = () => {
    setDraggedStageStatus(null)
    setStageDropTargetStatus(null)
  }

  const moveStage = (sourceStatus: LeadStatus, targetStatus: LeadStatus) => {
    if (sourceStatus === targetStatus) {
      return
    }

    setStageOrder((current) => {
      const sourceIndex = current.indexOf(sourceStatus)
      const targetIndex = current.indexOf(targetStatus)
      if (sourceIndex < 0 || targetIndex < 0) {
        return current
      }

      const next = [...current]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }

  const onColumnDrop = async (event: DragEvent<HTMLElement>, status: LeadStatus) => {
    event.preventDefault()

    const droppedLeadId = event.dataTransfer.getData('text/plain') || draggedLeadId
    const normalizedTargetStatus = normalizeLeadStatus(String(status || '')) as LeadStatus

    // Always prioritize lead card drops; stage reorder does not carry a lead id.
    if (droppedLeadId) {
      setDragOverStatus(null)
      setDraggedLeadId(null)
      setDraggedStageStatus(null)
      setStageDropTargetStatus(null)

      const draggedLead = leads.find((lead) => lead._id === droppedLeadId)
      const normalizedCurrentStatus = normalizeLeadStatus(String(draggedLead?.status || '')) as LeadStatus
      if (!draggedLead || normalizedCurrentStatus === normalizedTargetStatus) {
        return
      }

      await onMoveLead(droppedLeadId, normalizedTargetStatus)
      return
    }

    const droppedStage = event.dataTransfer.getData('application/x-curator-stage') || draggedStageStatus
    if (droppedStage) {
      moveStage(droppedStage as LeadStatus, status)
      setDraggedStageStatus(null)
      setStageDropTargetStatus(null)
      setDragOverStatus(null)
      setDraggedLeadId(null)
      return
    }

    setDragOverStatus(null)
    setDraggedLeadId(null)

    if (!droppedLeadId) {
      return
    }

    const draggedLead = leads.find((lead) => lead._id === droppedLeadId)
    if (!draggedLead || draggedLead.status === status) {
      return
    }

    await onMoveLead(droppedLeadId, status)
  }

  const sessionUser = getSessionUser()
  const canManageStages = sessionUser?.role === 'Super Admin' || sessionUser?.role === 'Admin'
  const canAssignLead = sessionUser?.role === 'Super Admin' || sessionUser?.role === 'Admin' || sessionUser?.role === 'Manager'

  const getUsername = (userId?: string) => {
    if (!userId) return 'Unassigned'
    const user = users.find((u) => u.id === userId)
    return user?.name || 'Unknown User'
  }

  const onRemoveStage = async (status: LeadStatus) => {
    if (!canManageStages) {
      return
    }

    if (stageOrder.length <= 1) {
      return
    }

    const fallbackStatus = stageOrder.find((item) => item !== status)
    if (!fallbackStatus) {
      return
    }

    const leadsInStage = leads.filter((lead) => normalizeLeadStatus(String(lead.status || '')) === status)

    try {
      setRemovingStageStatus(status)

      for (const lead of leadsInStage) {
        await onMoveLead(lead._id, fallbackStatus)
      }

      setHiddenStages((current) => (current.includes(status) ? current : [...current, status]))
      setCustomStages((current) => current.filter((item) => item !== status))
      setStageOrder((current) => current.filter((item) => item !== status))
    } finally {
      setRemovingStageStatus(null)
    }
  }

  const onAddStage = () => {
    const normalizedStage = normalizeLeadStatus(newStageName)
    if (!normalizedStage) {
      return
    }

    if (defaultLeadStatuses.includes(normalizedStage as (typeof defaultLeadStatuses)[number])) {
      setHiddenStages((current) => current.filter((item) => item !== normalizedStage))
      setNewStageName('')
      return
    }

    setCustomStages((current) => (current.includes(normalizedStage as LeadStatus) ? current : [...current, normalizedStage as LeadStatus]))
    setHiddenStages((current) => current.filter((item) => item !== normalizedStage))
    setNewStageName('')
  }

  return (
    <>
      <section className="pipeline-toolbar">
        <div>
          <h3>Lead Pipeline</h3>
          <p>Managing active opportunities across your sales stages.</p>
        </div>
        <div className="pipeline-actions">
          <div className="filter-group">
            <select>
              <option>Assigned To: All</option>
            </select>
            <select value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRangeFilter)}>
              <option value="7">Date: Last 7 Days</option>
              <option value="30">Date: Last 30 Days</option>
              <option value="90">Date: Last 90 Days</option>
              <option value="all">Date: All Time</option>
              <option value="custom">Date: Custom Range</option>
            </select>
            {dateRange === 'custom' ? (
              <div className="custom-date-range">
                <input
                  aria-label="From date"
                  type="date"
                  value={customFromDate}
                  onChange={(event) => setCustomFromDate(event.target.value)}
                />
                <input
                  aria-label="To date"
                  type="date"
                  value={customToDate}
                  min={customFromDate || undefined}
                  onChange={(event) => setCustomToDate(event.target.value)}
                />
              </div>
            ) : null}
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="all">Source: All Channels</option>
              {leadSourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  Source: {option.label}
                </option>
              ))}
            </select>
            <input
              value={newStageName}
              onChange={(event) => setNewStageName(event.target.value)}
              placeholder="New stage (for example: done, won, closed)"
              aria-label="Add lead stage"
            />
            <button type="button" className="square-btn" onClick={onAddStage} title="Add stage">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
          <button type="button" className="square-btn">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
          <button type="button" className="secondary-btn" onClick={onBulkUpload} title="Upload leads from Excel">
            <span className="material-symbols-outlined">upload_file</span>
            Upload Excel
          </button>
          <button type="button" className="square-btn" onClick={onDownloadTemplate} title="Download Excel template">
            <span className="material-symbols-outlined">download</span>
          </button>
        </div>
      </section>

      <section className="kanban-scroll">
        {stageOrder.map((status, stageIndex) => {
          const cards = grouped[status] || []
          const canRemoveStage = canManageStages && stageOrder.length > 1
          return (
            <KanbanColumn
              key={status}
              accent={stageAccentClasses[stageIndex % stageAccentClasses.length]}
              count={cards.length}
              title={formatLeadStatusLabel(status)}
              dropStatus={status}
              isDropActive={dragOverStatus === status}
              onCardDragStart={onCardDragStart}
              onCardClick={setSelectedLeadId}
              onColumnDrop={onColumnDrop}
              onColumnDragOver={onColumnDragOver}
              onStageDragStart={onStageDragStart}
              onStageDragEnd={onStageDragEnd}
              isStageDropActive={stageDropTargetStatus === status}
              canRemoveStage={canRemoveStage}
              onRemoveStage={onRemoveStage}
              removing={removingStageStatus === status}
              cards={cards.map((lead, index) => ({
                id: lead._id,
                name: lead.name,
                owner: getUsername(lead.assignedTo),
                value: formatINR(4500 + stageIndex * 6000 + index * 2500),
                tone: stageIndex >= 4 ? 'Hot' : index % 2 === 0 ? 'Warm' : 'Cold',
                time: index === 0 ? 'Just now' : `${index + 1}d ago`,
              }))}
              empty={cards.length === 0}
            />
          )
        })}
      </section>

      {selectedLead ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Lead details">
          <div className="modal-panel lead-detail-modal">
            <div className="lead-detail-head">
              <h3>Lead Details</h3>
              <button type="button" className="square-btn" onClick={() => setSelectedLeadId(null)} aria-label="Close lead details">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="lead-detail-grid">
              <div>
                <span>Name</span>
                <strong>{selectedLead.name}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{selectedLead.email}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{formatLeadStatusLabel(selectedLead.status)}</strong>
              </div>
              <div>
                <span>Source</span>
                <strong>{selectedLead.source || 'manual'}</strong>
              </div>
              <div>
                <span>Created At</span>
                <strong>{formatLeadDate(selectedLead.createdAt)}</strong>
              </div>
              <div>
                <span>Lead ID</span>
                <strong>{selectedLead._id}</strong>
              </div>
              {canAssignLead ? (
                <div>
                  <span>Assigned To</span>
                  <select
                    value={selectedLead.assignedTo || ''}
                    onChange={(event) => {
                      const userId = event.target.value || null
                      void onAssignLead(selectedLead._id, userId)
                    }}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      border: '1px solid #ddd',
                      fontSize: '1rem',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <span>Assigned To</span>
                  <strong>{getUsername(selectedLead.assignedTo)}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="floating-stats">
        <div>
          <span>Pipeline Value</span>
          <strong>{formatINR(2450000)}</strong>
        </div>
        <div className="divider"></div>
        <div>
          <span>Avg. Deal Size</span>
          <strong>{formatINR(18200)}</strong>
        </div>
        <button type="button">
          <span className="material-symbols-outlined">insights</span>
        </button>
      </div>
    </>
  )
}
