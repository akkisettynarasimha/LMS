import type { AppStats, Lead, LeadStatus } from '../../shared/crmTypes'

type DashboardBreakdown = {
  label: string
  count: number
  percent: number
  tone: string
}

const formatLeadStatusLabel = (status: LeadStatus) =>
  status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

type DashboardPageProps = {
  error: string
  loading: boolean
  metrics: AppStats
  recentLeads: Lead[]
  sourceBreakdown: DashboardBreakdown[]
  stageBreakdown: DashboardBreakdown[]
  lastSyncedAt: number | null
  onRefresh: () => Promise<void> | void
}

const formatRelativeTime = (input: string | number) => {
  const timestamp = typeof input === 'number' ? input : new Date(input).getTime()
  if (!Number.isFinite(timestamp)) {
    return 'Recently'
  }

  const elapsedMs = Date.now() - timestamp
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))

  if (elapsedSeconds < 10) {
    return 'Just now'
  }

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`
  }

  const elapsedDays = Math.floor(elapsedHours / 24)
  return `${elapsedDays}d ago`
}

export function DashboardPage({
  error,
  loading,
  metrics,
  recentLeads,
  sourceBreakdown,
  stageBreakdown,
  lastSyncedAt,
  onRefresh,
}: DashboardPageProps) {
  const liveLeads = recentLeads.length
  const topSource = sourceBreakdown[0]
  const conversionRateValue = Number.parseFloat(metrics.conversionRate) || 0
  const chartMax = Math.max(...stageBreakdown.map((item) => item.count), 1)
  const pulseQualityLabel = conversionRateValue >= 20 ? 'Strong' : conversionRateValue >= 10 ? 'Stable' : 'Needs focus'
  const summaryCards = [
    { label: 'Total Leads', value: metrics.total, caption: 'Live', icon: 'groups', tone: 'border-primary' },
    { label: 'New Leads', value: metrics.newLeads, caption: 'Fresh', icon: 'fiber_new', tone: 'border-secondary' },
    { label: 'Follow-ups', value: metrics.followUps, caption: 'Today', icon: 'event_repeat', tone: 'border-outline' },
    { label: 'Converted', value: metrics.converted, caption: `${metrics.conversionRate}%`, icon: 'check_circle', tone: 'border-accent' },
    { label: 'Lost Leads', value: metrics.lost, caption: 'Watch', icon: 'trending_down', tone: 'border-error' },
  ]

  return (
    <div className="dashboard-canvas">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="dashboard-live-actions">
            <p className="dashboard-kicker">Live dashboard</p>
            <button type="button" className="dashboard-refresh-btn" onClick={onRefresh}>
              <span className="material-symbols-outlined">refresh</span>
              Refresh now
            </button>
          </div>
          <h2>Executive view of active CRM data</h2>
          <p>
            This view stays tied to live lead records, so the pipeline reflects current activity without decorative noise.
          </p>
          <p className="dashboard-sync-note">
            Last synced: {lastSyncedAt ? formatRelativeTime(lastSyncedAt) : 'Not synced yet'}
          </p>
        </div>

        <div className="dashboard-hero-card dashboard-pulse-card">
          <div className="dashboard-pulse-head">
            <span className="dashboard-hero-label">Current pulse</span>
            <span className="dashboard-pulse-live">
              <span className="dashboard-pulse-live-dot" aria-hidden="true"></span>
              Live
            </span>
          </div>

          <div className="dashboard-pulse-main">
            <div className="dashboard-pulse-kpi primary">
              <span className="material-symbols-outlined" aria-hidden="true">groups</span>
              <div>
                <strong>{metrics.total}</strong>
                <small>Total leads</small>
              </div>
            </div>

            <div className="dashboard-pulse-kpi secondary">
              <span className="material-symbols-outlined" aria-hidden="true">trending_up</span>
              <div>
                <strong>{metrics.conversionRate}%</strong>
                <small>Conversion</small>
              </div>
            </div>
          </div>

          <div className="dashboard-pulse-meter-wrap">
            <div className="dashboard-pulse-meter-labels">
              <span>Pipeline health</span>
              <span>{pulseQualityLabel}</span>
            </div>

            <div className="dashboard-pulse-meter" role="img" aria-label={`Conversion rate ${metrics.conversionRate}%`}>
              <div style={{ width: `${Math.max(conversionRateValue, 5)}%` }}></div>
            </div>
          </div>

          <p className="dashboard-pulse-copy">Live pipeline snapshot updates automatically as new leads and stage changes arrive.</p>

          <div className="dashboard-pulse-grid">
            <div>
              <span>Top source</span>
              <h2 className="dashboard-pulse-source">{topSource?.label || 'No source yet'}</h2>
            </div>
            <div>
              <span>Recent updates</span>
              <strong>{liveLeads}</strong>
            </div>
            <div>
              <span>Converted</span>
              <strong>{metrics.converted}</strong>
            </div>
          </div>
        </div>
      </section>

      {error ? <p className="api-error">{error}</p> : null}
      {loading ? <p className="api-loading">Loading lead intelligence...</p> : null}

      <section className="stats-grid dashboard-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className={`stat-card dashboard-summary-card ${card.tone}`}>
            <div className="stat-card-top">
              <p>{card.label}</p>
              <span className="material-symbols-outlined stat-card-icon">{card.icon}</span>
            </div>
            <div className="stat-card-bottom">
              <h3>{card.value}</h3>
              <span>{card.caption}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="mid-grid">
        <article className="panel dashboard-dark-panel dashboard-chart-panel">
          <div className="panel-head-row">
            <div>
              <h4>Pipeline Chart</h4>
              <p>Actual lead counts rendered as a live chart.</p>
            </div>
            <span className="material-symbols-outlined">monitoring</span>
          </div>

          <div className="dashboard-chart-shell">
            {stageBreakdown.length > 0 ? (
              <div className="dashboard-live-chart" role="img" aria-label="Pipeline bar chart">
                {stageBreakdown.map((item, index) => {
                  const barWidth = `${Math.max(item.percent, item.count > 0 ? 10 : 2)}%`

                  return (
                    <div key={item.label} className="dashboard-live-chart-row" style={{ '--row-delay': `${index * 70}ms` } as React.CSSProperties}>
                      <div className="dashboard-live-chart-head">
                        <div>
                          <strong>{item.label}</strong>
                          <span>{item.count} leads</span>
                        </div>
                        <span className="dashboard-live-chart-percent">{item.percent}%</span>
                      </div>

                      <div className="dashboard-live-chart-track">
                        <div className={item.tone} style={{ width: barWidth }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="dashboard-empty-state compact dark">
                <span className="material-symbols-outlined">stacked_bar_chart</span>
                <p>No live pipeline data yet. Add leads to populate the chart.</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel dashboard-dark-panel">
          <div className="panel-head-row">
            <div>
              <h4>Pipeline Stages</h4>
              <p>Live share of the current CRM pipeline.</p>
            </div>
            <span className="material-symbols-outlined">route</span>
          </div>

          <div className="dashboard-stage-grid">
            {stageBreakdown.map((item) => (
              <div key={item.label} className="dashboard-stage-card">
                <div className="dashboard-stage-card-top">
                  <div>
                    <p>{item.label}</p>
                    <strong>{item.count}</strong>
                  </div>
                  <span>{item.percent}%</span>
                </div>

                <div className="dashboard-stage-bar">
                  <div className={item.tone} style={{ width: `${Math.max(item.percent, 8)}%` }}></div>
                </div>

                <small>{item.percent}% of pipeline</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel dashboard-surface-panel">
          <div className="panel-head-row">
            <div>
              <h4>Recent Leads</h4>
              <p>Latest captured records from the live database.</p>
            </div>
            <span className="material-symbols-outlined dashboard-panel-icon">bolt</span>
          </div>

          <div className="dashboard-recent-list">
            {recentLeads.length > 0 ? (
              recentLeads.map((lead, index) => (
                <div className="dashboard-recent-item" key={lead._id}>
                  <div className="dashboard-lead-avatar">{lead.name.slice(0, 1).toUpperCase()}</div>

                  <div className="dashboard-recent-body">
                    <div className="dashboard-recent-top">
                      <div>
                        <h5>{lead.name}</h5>
                        <p>{lead.email}</p>
                      </div>
                      <span className="dashboard-source-chip">{lead.source || 'Direct'}</span>
                    </div>

                    <div className="dashboard-recent-foot">
                      <span className={`dashboard-status-pill ${lead.status}`}>{formatLeadStatusLabel(lead.status)}</span>
                      <small>{formatRelativeTime(lead.createdAt)}</small>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="dashboard-empty-state compact">
                <span className="material-symbols-outlined">person_add</span>
                <p>No recent leads yet. The feed updates as new leads are added.</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel dashboard-surface-panel wide-panel">
          <div className="panel-head-row">
            <div>
              <h4>Live Activity Feed</h4>
              <p>Chronological updates from the latest lead activity.</p>
            </div>
            <a href="#">View All Logs</a>
          </div>

          <div className="feed-list">
            {recentLeads.length > 0 ? (
              recentLeads.map((lead, index) => (
                <div className="feed-item" key={lead._id}>
                  <div className="feed-icon">
                    <span className="material-symbols-outlined">
                      {lead.status === 'qualified' ? 'check_circle' : 'person_add'}
                    </span>
                  </div>

                  <div className="feed-body">
                    <div className="feed-title">
                      <h5>{lead.name} updated</h5>
                      <span>{formatRelativeTime(lead.createdAt)}</span>
                    </div>
                    <p>
                      {lead.email} came in from <strong>{lead.source || 'Direct'}</strong> and is currently in{' '}
                      <strong>{formatLeadStatusLabel(lead.status)}</strong> stage.
                    </p>

                    <div className="feed-meta">
                      <span className={`dashboard-status-pill ${lead.status}`}>{formatLeadStatusLabel(lead.status)}</span>
                      <span className="dashboard-source-chip subtle">{lead.email}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="feed-item">
                <div className="feed-icon muted">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div className="feed-body">
                  <div className="feed-title">
                    <h5>No activity yet</h5>
                    <span>Start by adding leads</span>
                  </div>
                  <p>When leads are captured, this timeline will update in real time.</p>
                </div>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}
