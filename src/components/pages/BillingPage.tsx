import { useEffect, useMemo, useState } from 'react'

type BillingMetric = {
  label: string
  value: string
  delta: string
  tone: 'up' | 'down'
}

type Collector = {
  name: string
  initials: string
  role: string
  target: string
}

type InvoiceCard = {
  invoice: string
  account: string
  status: string
  statusTone: string
  amount: string
  dueDate: string
  owner: string
  ownerInitials: string
}

type BillingSummary = {
  metrics: BillingMetric[]
  pipeline: {
    billed: number
    approved: number
    sent: number
    inCollection: number
    disputed: number
  }
  forecast: number[]
  topCollectors: Collector[]
  recentInvoices: InvoiceCard[]
  insight: string
}

export function BillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadBilling = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch('/api/billing/summary')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Could not load billing summary')
        }

        setSummary(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load billing summary'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void loadBilling()
  }, [])

  const pipelineBars = useMemo(() => {
    if (!summary) {
      return []
    }

    const billed = Math.max(summary.pipeline.billed, 1)

    return [
      { label: 'Billed', amount: summary.pipeline.billed, width: 100 },
      { label: 'Approved', amount: summary.pipeline.approved, width: Math.max(15, Math.round((summary.pipeline.approved / billed) * 100)) },
      { label: 'Sent', amount: summary.pipeline.sent, width: Math.max(15, Math.round((summary.pipeline.sent / billed) * 100)) },
      { label: 'In Collection', amount: summary.pipeline.inCollection, width: Math.max(15, Math.round((summary.pipeline.inCollection / billed) * 100)) },
      { label: 'Disputed', amount: summary.pipeline.disputed, width: Math.max(15, Math.round((summary.pipeline.disputed / billed) * 100)) },
    ]
  }, [summary])

  const formatCompactUSD = (amount: number) => {
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`
    }

    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(1)}K`
    }

    return `$${amount.toFixed(0)}`
  }

  if (loading) {
    return (
      <div className="sales-wrap">
        <section className="sales-panel">
          <h2>Loading billing data...</h2>
        </section>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="sales-wrap">
        <section className="sales-panel">
          <h2>Billing data unavailable</h2>
          <p>{error || 'No billing summary available.'}</p>
        </section>
      </div>
    )
  }

  return (
    <div className="sales-wrap">
      <section className="sales-metrics-grid">
        {summary.metrics.map((item) => (
          <article key={item.label} className="sales-metric-card tone-revenue">
            <div className="metric-top">
              <p>{item.label}</p>
              <span className={`metric-trend ${item.tone}`}>
                <span className="material-symbols-outlined">{item.tone === 'up' ? 'trending_up' : 'trending_down'}</span>
                <em>{item.delta}</em>
              </span>
            </div>
            <h3>{item.value}</h3>
            <div className="metric-foot">
              <small>vs previous cycle</small>
              <div className={`metric-spark ${item.tone}`}>
                <span></span><span></span><span></span><span></span><span></span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="sales-layout-grid">
        <div className="sales-main-col">
          <article className="sales-panel">
            <div className="sales-panel-head">
              <h2>Cash Flow Pipeline</h2>
              <div className="sales-filters">
                <span>Live Data</span>
                <span>All Accounts</span>
              </div>
            </div>
            <div className="pipeline-stack">
              {pipelineBars.map((bar) => (
                <div key={bar.label} className="pipeline-bar" style={{ width: `${bar.width}%` }}>
                  <span>{bar.label}</span>
                  <strong>{formatCompactUSD(bar.amount)}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="sales-panel">
            <div className="sales-panel-head">
              <div>
                <h2>Revenue Forecast</h2>
                <p>Projected vs actual billing collections per month</p>
              </div>
              <div className="legend-mini">
                <span><i className="actual"></i>Actual</span>
                <span><i className="projected"></i>Projected</span>
              </div>
            </div>
            <div className="forecast-bars">
              {summary.forecast.map((height, index) => (
                <div key={height + index} className="forecast-col">
                  <div className={`forecast-bar ${index > 2 ? 'projected' : 'actual'}`} style={{ height: `${height}%` }}></div>
                  <small>{['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}</small>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="sales-side-col">
          <article className="performers-card">
            <h2>Top Collectors</h2>
            <div className="performer-list">
              {summary.topCollectors.map((collector) => (
                <div key={collector.name} className="performer-row">
                  <div className="performer-meta">
                    <div className="performer-fallback" style={{ display: 'inline-flex' }}>{collector.initials}</div>
                    <div>
                      <p>{collector.name}</p>
                      <small>{collector.role}</small>
                    </div>
                  </div>
                  <div className="performer-target">
                    <strong>{collector.target}</strong>
                    <small>of collection target</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="insight-card">
            <h3>
              <span className="material-symbols-outlined">auto_awesome</span>
              Billing Insights
            </h3>
            <p>
              {summary.insight}
            </p>
          </article>
        </aside>
      </section>

      <section className="sales-deals-table">
        <div className="sales-panel-head">
          <h2>Recent Invoices</h2>
          <button type="button">View Ledger <span className="material-symbols-outlined">arrow_forward</span></button>
        </div>
        <div className="opportunity-list">
          {summary.recentInvoices.map((invoice) => (
            <article key={invoice.invoice} className="opportunity-item">
              <div className="opportunity-main">
                <h3>{invoice.invoice}</h3>
                <p>Account: {invoice.account}</p>
              </div>
              <div className="opportunity-meta">
                <span className={`deal-stage ${invoice.statusTone}`}>{invoice.status}</span>
                <span className="close-chip">
                  <span className="material-symbols-outlined">event</span>
                  {invoice.dueDate}
                </span>
              </div>
              <div className="opportunity-side">
                <strong className="deal-value">{invoice.amount}</strong>
                <div className="deal-owner">
                  <span>{invoice.ownerInitials}</span>
                  <small>{invoice.owner}</small>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <button className="sales-fab" type="button" aria-label="Create invoice">
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  )
}
