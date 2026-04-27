import type { AppStats } from '../../shared/crmTypes'

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

export type ReportsPageProps = {
  metrics: AppStats
}

export function ReportsPage({ metrics }: ReportsPageProps) {
  const sourceRows = [
    { label: 'Google Ads', percent: 42 },
    { label: 'Direct Website', percent: 28 },
    { label: 'Facebook/Meta', percent: 18 },
    { label: 'Referral', percent: 12 },
  ]

  const trendValues = [54, 61, 49, 68, 72, 66, 79, 74, 82, 77, 84, 91]

  const stageRows = [
    { label: 'New Leads', value: Math.max(metrics.total, 1284), color: 'var(--primary)' },
    { label: 'Contacted', value: Math.max(metrics.contacted, 842), color: 'var(--secondary)' },
    { label: 'Interested', value: Math.max(metrics.newLeads, 512), color: '#2d8cff' },
    { label: 'Proposal', value: 298, color: '#70b6ff' },
    { label: 'Won', value: Math.max(metrics.converted, 142), color: '#22c55e' },
  ]

  const maxStageValue = Math.max(...stageRows.map((row) => row.value), 1)
  const pipelineValue = 2450000
  const avgDeal = 18200
  const winVelocity = 31

  const reps = [
    {
      name: 'Alex Thompson',
      role: 'Senior Specialist',
      totalLeads: 342,
      conversion: '14.2%',
      delta: 'up',
      deltaText: '+2%',
      response: '12 mins',
      revenue: formatINR(42500),
      status: 'On Target',
      statusTone: 'status-good',
    },
    {
      name: 'Sarah Jenkins',
      role: 'Account Manager',
      totalLeads: 298,
      conversion: '12.8%',
      delta: 'down',
      deltaText: '-1%',
      response: '15 mins',
      revenue: formatINR(38200),
      status: 'Watchlist',
      statusTone: 'status-warn',
    },
    {
      name: 'Daniel Ortiz',
      role: 'Sales Executive',
      totalLeads: 188,
      conversion: '10.4%',
      delta: 'up',
      deltaText: '+4%',
      response: '9 mins',
      revenue: formatINR(21000),
      status: 'Top Performer',
      statusTone: 'status-good',
    },
  ]

  return (
    <div className="reports-modern">
      <section className="reports-hero">
        <div className="reports-hero-content">
          <span className="reports-hero-badge">Performance intelligence</span>
          <h2 className="reports-hero-title">Revenue narrative from live sales signals</h2>
          <p className="reports-hero-copy">
            Monitor pipeline movement, source quality, and rep execution in one focused command center.
          </p>
          <div className="reports-hero-meta">
            <span><strong>{metrics.total}</strong> active opportunities</span>
            <span><strong>{metrics.converted}</strong> closed-won leads</span>
            <span><strong>{metrics.conversionRate}%</strong> conversion rate</span>
          </div>
        </div>
        <button type="button" className="reports-hero-action">
          <span className="material-symbols-outlined">download</span>
          Export Snapshot
        </button>
      </section>

      <section className="reports-kpi-grid">
        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span>Pipeline Value</span>
            <span className="material-symbols-outlined">payments</span>
          </div>
          <strong className="reports-kpi-value">{formatINR(pipelineValue)}</strong>
          <small className="reports-kpi-delta up">+8.4% MoM</small>
        </article>
        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span>Average Deal</span>
            <span className="material-symbols-outlined">sell</span>
          </div>
          <strong className="reports-kpi-value">{formatINR(avgDeal)}</strong>
          <small className="reports-kpi-delta up">+3.1% MoM</small>
        </article>
        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span>Conversion Rate</span>
            <span className="material-symbols-outlined">monitoring</span>
          </div>
          <strong className="reports-kpi-value">{metrics.conversionRate}%</strong>
          <small className="reports-kpi-delta up">+1.2 pts</small>
        </article>
        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span>Win Velocity</span>
            <span className="material-symbols-outlined">bolt</span>
          </div>
          <strong className="reports-kpi-value">{winVelocity} days</strong>
          <small className="reports-kpi-delta down">-2.0 days</small>
        </article>
      </section>

      <section className="reports-layout">
        <article className="reports-block reports-funnel-block">
          <div className="reports-block-head">
            <div>
              <h3>Conversion Funnel</h3>
              <p>Track the weighted drop-off and progression through each selling stage.</p>
            </div>
            <span className="funnel-growth">+12.5% vs Last Month</span>
          </div>

          <div className="reports-funnel">
            {stageRows.map((stage) => (
              <div className="reports-funnel-item" key={stage.label}>
                <div className="reports-funnel-label-row">
                  <span>{stage.label}</span>
                  <strong>{stage.value}</strong>
                </div>
                <div className="reports-funnel-bar">
                  <div
                    className="reports-funnel-fill"
                    style={{ width: `${Math.max((stage.value / maxStageValue) * 100, 8)}%`, background: stage.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="reports-block reports-source-block">
          <div className="reports-block-head">
            <div>
              <h3>Source Mix</h3>
              <p>Channel contribution to total qualified opportunities.</p>
            </div>
          </div>

          <div className="source-rows modern">
            {sourceRows.map((source) => (
              <div className="source-row" key={source.label}>
                <div>
                  <span>{source.label}</span>
                  <span>{source.percent}%</span>
                </div>
                <div className="source-track">
                  <div style={{ width: `${source.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <p className="source-insight">
            <strong>Insight:</strong> Digital channels account for 88% of total qualified demand this cycle.
          </p>
        </article>

        <article className="reports-block reports-trend-block">
          <div className="reports-block-head">
            <div>
              <h3>Lead Momentum</h3>
              <p>Weekly pulse of inbound demand and team follow-through.</p>
            </div>
          </div>

          <div className="reports-trend-chart">
            {trendValues.map((value, index) => (
              <div key={`${value}-${index}`} className={`reports-trend-col ${index === trendValues.length - 1 ? 'is-current' : ''}`}>
                <span style={{ height: `${value}%` }}></span>
              </div>
            ))}
          </div>
        </article>

        <article className="reports-block reports-table-block">
          <div className="reports-block-head">
            <div>
              <h3>Sales Team Performance</h3>
              <p>Rep-level outcomes for response quality, conversion, and revenue impact.</p>
            </div>

            <div className="table-actions">
              <button type="button">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button type="button">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
          </div>

          <div className="reports-team-grid">
            {reps.map((rep, index) => (
              <article className="reports-team-card" key={rep.name}>
                <div className="reports-team-head">
                  <div className="rep-cell modern">
                    <div className="rep-avatar modern">{rep.name.charAt(0)}</div>
                    <div>
                      <p>{rep.name}</p>
                      <span>{rep.role}</span>
                    </div>
                  </div>

                  <div className="reports-team-rank">#{index + 1}</div>
                </div>

                <div className="reports-team-metrics">
                  <div>
                    <small>Total Leads</small>
                    <strong>{rep.totalLeads}</strong>
                  </div>
                  <div>
                    <small>Conv. Rate</small>
                    <strong>{rep.conversion}</strong>
                    <span className={rep.delta === 'up' ? 'delta-up' : 'delta-down'}>{rep.deltaText}</span>
                  </div>
                  <div>
                    <small>Avg. Response</small>
                    <strong>{rep.response}</strong>
                  </div>
                  <div>
                    <small>Revenue</small>
                    <strong className="revenue-cell modern">{rep.revenue}</strong>
                  </div>
                </div>

                <div className="reports-team-foot">
                  <span className={`status-pill modern ${rep.statusTone}`}>{rep.status}</span>
                  <button type="button" className="reports-team-action">
                    View Profile
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
