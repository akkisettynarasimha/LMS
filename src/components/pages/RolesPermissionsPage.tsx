export function RolesPermissionsPage() {
  const roleRows = [
    {
      name: 'Super Admin',
      description: 'Complete platform control including system configuration.',
      modules: ['ALL MODULES', 'SETTINGS', 'SECURITY', 'USERS', 'BILLING'],
      grants: [true, true, true, true],
      stripe: 'stripe-primary',
    },
    {
      name: 'Admin',
      description: 'Full system access and data export rights.',
      modules: ['LEADS', 'REPORTS', 'ANALYTICS', 'BILLING', 'TEAM'],
      grants: [true, true, true, true],
      stripe: 'stripe-primary',
    },
    {
      name: 'Manager',
      description: 'Team management and performance audits.',
      modules: ['LEADS', 'REPORTS', 'ANALYTICS', 'TEAM'],
      grants: [true, true, true, false],
      stripe: 'stripe-secondary',
    },
    {
      name: 'Sales Executive',
      description: 'Frontline sales and customer interactions.',
      modules: ['LEADS', 'REPORTS'],
      grants: [true, true, false, false],
      stripe: 'stripe-tertiary',
    },
    {
      name: 'Telecaller',
      description: 'Limited lead access for verification calls.',
      modules: ['LEADS'],
      grants: [true, false, false, false],
      stripe: 'stripe-muted',
    },
  ]

  return (
    <div className="roles-wrap">
      <section className="roles-head">
        <div>
          <h2>Roles &amp; Permissions</h2>
          <p>Configure and audit granular access control across your organization's CRM data.</p>
        </div>
        <button type="button">
          <span className="material-symbols-outlined">add</span>
          Define New Role
        </button>
      </section>

      <section className="roles-table panel">
        <div className="roles-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Role Name &amp; Description</th>
                <th>Modules Access</th>
                <th>Matrix (V/C/E/D)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roleRows.map((role) => (
                <tr key={role.name}>
                  <td>
                    <div className="role-name-cell">
                      <i className={role.stripe}></i>
                      <div>
                        <p>{role.name}</p>
                        <span>{role.description}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="module-chips">
                      {role.modules.map((module) => (
                        <span key={`${role.name}-${module}`}>{module}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="grant-dots">
                      {role.grants.map((allowed, index) => (
                        <span key={`${role.name}-${index}`} className={allowed ? 'on' : 'off'}></span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="role-actions">
                      <button type="button"><span className="material-symbols-outlined">edit</span></button>
                      <button type="button"><span className="material-symbols-outlined">content_copy</span></button>
                      <button type="button"><span className="material-symbols-outlined">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
