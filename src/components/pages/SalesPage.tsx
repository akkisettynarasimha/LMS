const topPerformers = [
  {
    name: 'Marcus Chen',
    role: 'Enterprise AE',
    target: '142%',
    initials: 'MC',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB6b8addDd_A_fbaAfNUAimOxvXCaII21EQgDSVFp37O7Qi6I15clIzTekn0y6AgkYkjXtEaTpjUgcFVy1_jeCdiVF8Uyh842btEn09GSftFbcfv4hcxhYr0AuoXANu9o_yCr81w7-ADi-R_QFdoXOATrCgiZU-lKhK2yN6eVgoXFzWhqoSZ26Ci5Rm14ojiP3NfZHpYdYHIsdeTdxMEKSpO9Nkzke-j7c5ti9qVg-J0bNJDuCXw4KDm3HsCtOCRhPocYAkNkHhTn4E',
  },
  {
    name: 'Sarah Jenkins',
    role: 'Mid-Market AE',
    target: '128%',
    initials: 'SJ',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDRDfLdu9CHg8-daFZh-aUf-Wt5KbqHPXdIIpEebftKsYLYXqhuwCjVlJzz_M7qEvjdA6lqpKNy_yoIY7C1X9CbvFn3fWiAgS61ye742BPTM8F_tx1pKASLXMO7svhLt3vZsKOvV0AhD14X14tzHxJjWjwobmQ6B6-qHMkh-M6lTbgjMjJSNwnPYPdgHqvLnr1EnJeg_yVsygHCzmtD-uWwbusllFqcTRQTupgyVH_Hwd8Bfo2794F9XS71t7G7geupPRSvwYUhzssi',
  },
  {
    name: 'David Rossi',
    role: 'Strategic AE',
    target: '115%',
    initials: 'DR',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCk7grI1wiLbkVF2Ef3P6ma-e59DS0L1CSXRbfK1_ZSxj9OEMrp0xIy_Zpu6LjWHAMSsR9FD04LLs2sah8d4GzyQQb9-io1W74IGUrlnlzJCMHLhiU4Kx38N_vdc8wirxnHQS99wIP-WpAJfBl_EQAz94eSjfNTHFP87Lu8CcVEDVQaCrBFBX7rtvI4x2gMsmOGgOJNHtZvrxwXQuItFW9MsOjZhs0V6Yt3tuykuusIaUF5xTqsMV6mpvxerYkN2Xj7GI55gxLe96xH',
  },
]

const recentDeals = [
  {
    deal: 'Global Logistics Hub Expansion',
    account: 'Logistics Pro Co.',
    stage: 'Proposal',
    stageTone: 'tone-proposal',
    value: '$240,000',
    closeDate: 'Oct 24, 2023',
    owner: 'Marcus Chen',
    ownerInitials: 'MC',
  },
  {
    deal: 'SaaS Infrastructure Migration',
    account: 'CloudScale Inc.',
    stage: 'Negotiation',
    stageTone: 'tone-negotiation',
    value: '$125,500',
    closeDate: 'Nov 12, 2023',
    owner: 'Sarah Jenkins',
    ownerInitials: 'SJ',
  },
  {
    deal: 'Cybersecurity Suite Implementation',
    account: 'Metro Bank',
    stage: 'Discovery',
    stageTone: 'tone-discovery',
    value: '$48,000',
    closeDate: 'Dec 05, 2023',
    owner: 'David Rossi',
    ownerInitials: 'DR',
  },
]

export function SalesPage() {
  return (
    <div className="sales-wrap">
      <section className="sales-metrics-grid">
        <article className="sales-metric-card tone-revenue">
          <div className="metric-top">
            <p>Total Revenue</p>
            <span className="metric-trend up">
              <span className="material-symbols-outlined">trending_up</span>
              <em>+12.4%</em>
            </span>
          </div>
          <h3>$4,285,000</h3>
          <div className="metric-foot">
            <small>vs previous month</small>
            <div className="metric-spark up">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
        </article>
        <article className="sales-metric-card tone-win">
          <div className="metric-top">
            <p>Win Rate</p>
            <span className="metric-trend up">
              <span className="material-symbols-outlined">trending_up</span>
              <em>+3.1%</em>
            </span>
          </div>
          <h3>64.2%</h3>
          <div className="metric-foot">
            <small>strong close ratio</small>
            <div className="metric-spark up">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
        </article>
        <article className="sales-metric-card tone-average">
          <div className="metric-top">
            <p>Average Deal Size</p>
            <span className="metric-trend down">
              <span className="material-symbols-outlined">trending_down</span>
              <em>-1.2%</em>
            </span>
          </div>
          <h3>$82.4K</h3>
          <div className="metric-foot">
            <small>watch enterprise segment</small>
            <div className="metric-spark down">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
        </article>
        <article className="sales-metric-card tone-active">
          <div className="metric-top">
            <p>Active Deals</p>
            <span className="metric-trend up">
              <span className="material-symbols-outlined">trending_up</span>
              <em>+8%</em>
            </span>
          </div>
          <h3>148</h3>
          <div className="metric-foot">
            <small>healthy opportunity volume</small>
            <div className="metric-spark up">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
        </article>
      </section>

      <section className="sales-layout-grid">
        <div className="sales-main-col">
          <article className="sales-panel">
            <div className="sales-panel-head">
              <h2>Deal Pipeline Value</h2>
              <div className="sales-filters">
                <span>Q3 2023</span>
                <span>All Regions</span>
              </div>
            </div>
            <div className="pipeline-stack">
              <div className="pipeline-bar p100"><span>Qualification</span><strong>$1.8M (42 Deals)</strong></div>
              <div className="pipeline-bar p85"><span>Discovery</span><strong>$1.2M (31 Deals)</strong></div>
              <div className="pipeline-bar p60"><span>Proposal</span><strong>$840K (18 Deals)</strong></div>
              <div className="pipeline-bar p35"><span>Negotiation</span><strong>$420K (9 Deals)</strong></div>
              <div className="pipeline-bar p15"><span>Closing</span><strong>$210K (5 Deals)</strong></div>
            </div>
          </article>

          <article className="sales-panel">
            <div className="sales-panel-head">
              <div>
                <h2>Revenue Forecast</h2>
                <p>Projected vs actual revenue per month</p>
              </div>
              <div className="legend-mini">
                <span><i className="actual"></i>Actual</span>
                <span><i className="projected"></i>Projected</span>
              </div>
            </div>
            <div className="forecast-bars">
              {[60, 75, 85, 40, 65, 95].map((height, index) => (
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
            <h2>Top Performers</h2>
            <div className="performer-list">
              {topPerformers.map((person) => (
                <div key={person.name} className="performer-row">
                  <div className="performer-meta">
                    <img src={person.avatar} alt={person.name} onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }} />
                    <div className="performer-fallback">{person.initials}</div>
                    <div>
                      <p>{person.name}</p>
                      <small>{person.role}</small>
                    </div>
                  </div>
                  <div className="performer-target">
                    <strong>{person.target}</strong>
                    <small>to target</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="insight-card">
            <h3>
              <span className="material-symbols-outlined">auto_awesome</span>
              AI Insights
            </h3>
            <p>
              Opportunities in the <strong>Negotiation</strong> stage are moving 12% faster than last month. Consider allocating more
              resources to close Q3 strong.
            </p>
          </article>
        </aside>
      </section>

      <section className="sales-deals-table">
        <div className="sales-panel-head">
          <h2>Recent Opportunities</h2>
          <button type="button">View Pipeline <span className="material-symbols-outlined">arrow_forward</span></button>
        </div>
        <div className="opportunity-list">
          {recentDeals.map((deal) => (
            <article key={deal.deal} className="opportunity-item">
              <div className="opportunity-main">
                <h3>{deal.deal}</h3>
                <p>Account: {deal.account}</p>
              </div>
              <div className="opportunity-meta">
                <span className={`deal-stage ${deal.stageTone}`}>{deal.stage}</span>
                <span className="close-chip">
                  <span className="material-symbols-outlined">event</span>
                  {deal.closeDate}
                </span>
              </div>
              <div className="opportunity-side">
                <strong className="deal-value">{deal.value}</strong>
                <div className="deal-owner">
                  <span>{deal.ownerInitials}</span>
                  <small>{deal.owner}</small>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <button className="sales-fab" type="button" aria-label="Add opportunity">
        <span className="material-symbols-outlined">add</span>
      </button>
    </div>
  )
}
