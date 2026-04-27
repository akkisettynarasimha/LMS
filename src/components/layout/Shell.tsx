import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { clearSessionData, getSessionUser, hasModuleAccess } from '../../shared/accessControl'

export type ShellProps = {
  children: ReactNode
  pageTitle: string
  searchPlaceholder: string
  onNewLead: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

type ShellBrandSettings = {
  companyName: string
  industry: string
  primaryBrandColor: string
  logoDataUrl: string
  faviconDataUrl: string
}

const defaultBrand: ShellBrandSettings = {
  companyName: 'Curator CRM',
  industry: 'Enterprise SaaS',
  primaryBrandColor: '#0059BB',
  logoDataUrl: '',
  faviconDataUrl: '',
}

const settingsHostCandidate = typeof window !== 'undefined' ? window.location.hostname : 'localhost'

const SETTINGS_ENDPOINTS = Array.from(
  new Set([
    '/api/settings',
    'http://localhost:5000/api/settings',
    'http://127.0.0.1:5000/api/settings',
    `http://${settingsHostCandidate}:5000/api/settings`,
  ]),
)

const parseApiResponse = async (response: Response) => {
  const raw = await response.text()
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return raw ? JSON.parse(raw) : {}
  }

  if (!raw) {
    return {}
  }

  return JSON.parse(raw)
}

const requestBrandSettings = async (): Promise<Partial<ShellBrandSettings>> => {
  for (const endpoint of SETTINGS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint)
      const data = await parseApiResponse(response)
      if (!response.ok) {
        continue
      }
      return data
    } catch {
      // Try next endpoint.
    }
  }

  return {}
}

export function Shell({ children, pageTitle, searchPlaceholder, onNewLead, searchQuery, onSearchChange }: ShellProps) {
  const navigate = useNavigate()
  const sessionUser = getSessionUser()
  const canInviteTeam = Boolean(sessionUser && hasModuleAccess(sessionUser.role, 'TEAM'))
  const [brand, setBrand] = useState<ShellBrandSettings>(defaultBrand)

  useEffect(() => {
    const loadSettings = async () => {
      const data = await requestBrandSettings()

      setBrand({
        companyName: data.companyName || defaultBrand.companyName,
        industry: data.industry || defaultBrand.industry,
        primaryBrandColor: data.primaryBrandColor || defaultBrand.primaryBrandColor,
        logoDataUrl: data.logoDataUrl || '',
        faviconDataUrl: data.faviconDataUrl || '',
      })
    }

    void loadSettings()

    const onSettingsUpdated = () => {
      void loadSettings()
    }

    window.addEventListener('crm-settings-updated', onSettingsUpdated)
    return () => window.removeEventListener('crm-settings-updated', onSettingsUpdated)
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--secondary', brand.primaryBrandColor)

    if (brand.faviconDataUrl) {
      let faviconEl = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
      if (!faviconEl) {
        faviconEl = document.createElement('link')
        faviconEl.rel = 'icon'
        document.head.appendChild(faviconEl)
      }
      faviconEl.href = brand.faviconDataUrl
    }
  }, [brand.faviconDataUrl, brand.primaryBrandColor])

  const handleSignOut = () => {
    clearSessionData()
    navigate('/login', { replace: true })
  }

  const handleInviteTeam = () => {
    if (!sessionUser) {
      navigate('/login', { replace: true })
      return
    }

    if (canInviteTeam) {
      navigate('/users/invite')
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="crm-page">
      <aside className="crm-sidenav">
        <div className="brand-block">
          {brand.logoDataUrl ? (
            <img src={brand.logoDataUrl} alt="Company logo" className="brand-logo" />
          ) : (
            <div className="brand-icon">
              <span className="material-symbols-outlined">dashboard</span>
            </div>
          )}
          <div>
            <h1>{brand.companyName}</h1>
            <p>{brand.industry}</p>
          </div>
        </div>

        <nav className="nav-links">
          {sessionUser && hasModuleAccess(sessionUser.role, 'LEADS') ? (
            <>
              <NavLink to="/" end>
                <span className="material-symbols-outlined">dashboard</span>
                Dashboard
              </NavLink>
              <NavLink to="/leads">
                <span className="material-symbols-outlined">view_kanban</span>
                Leads
              </NavLink>
            </>
          ) : null}
          {sessionUser && hasModuleAccess(sessionUser.role, 'ANALYTICS') ? (
            <NavLink to="/sales">
              <span className="material-symbols-outlined">trending_up</span>
              Sales
            </NavLink>
          ) : null}
          {sessionUser && hasModuleAccess(sessionUser.role, 'BILLING') ? (
            <NavLink to="/billing">
              <span className="material-symbols-outlined">receipt_long</span>
              Billing
            </NavLink>
          ) : null}
          {sessionUser && hasModuleAccess(sessionUser.role, 'REPORTS') ? (
            <NavLink to="/reports">
              <span className="material-symbols-outlined">analytics</span>
              Reports
            </NavLink>
          ) : null}
          {sessionUser && hasModuleAccess(sessionUser.role, 'TEAM') ? (
            <NavLink to="/users">
              <span className="material-symbols-outlined">group</span>
              Users
            </NavLink>
          ) : null}
          {sessionUser && hasModuleAccess(sessionUser.role, 'SETTINGS') ? (
            <NavLink to="/profile">
              <span className="material-symbols-outlined">person</span>
              Personal Information
            </NavLink>
          ) : null}
          {sessionUser && hasModuleAccess(sessionUser.role, 'SETTINGS') ? (
            <NavLink to="/settings">
              <span className="material-symbols-outlined">settings</span>
              Settings
            </NavLink>
          ) : null}
        </nav>

        <div className="sidenav-bottom">
          <button type="button" onClick={handleInviteTeam}>
            <span className="material-symbols-outlined">person_add</span>
            Invite Team
          </button>
          <a href="#">
            <span className="material-symbols-outlined">help</span>
            Support
          </a>
          <a href="#" onClick={(event) => {
            event.preventDefault()
            handleSignOut()
          }}>
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </a>
        </div>
      </aside>

      <main className="crm-main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-title">{pageTitle}</div>
            <div className="search-wrap">
              <span className="material-symbols-outlined">search</span>
              <input placeholder={searchPlaceholder} type="text" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} />
            </div>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn" type="button">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="icon-btn" type="button">
              <span className="material-symbols-outlined">swap_horiz</span>
            </button>
            <button className="new-lead-btn" onClick={onNewLead} type="button">
              <span className="material-symbols-outlined">add</span>
              New Lead
            </button>
            <div className="user-mini">
              <div>
                <p>{sessionUser?.name || 'Guest'}</p>
                <span>{sessionUser?.role || 'Not signed in'}</span>
              </div>
              <Link to="/profile" aria-label="Open profile settings" className="profile-link-avatar">
                <img
                  alt="User Avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeNjF0zOGWjEfsUTxndTO6GjBi6P4v2LFhpNB0K-LypDnapfIGwM4G5Lr1nSJBAIyaa3IW7OgMNhCYkYgl5FosawOQV3fWxEsq86urGII5PbgOM_E7jLR2ixMIpSN6C6H2zh41OKxPFMH9Z9pSf251jerQBzkKkUhzOmE_i8Yr2frRmwwpM7wRH89NP3fV1KhPhfE6YV5XM27Ur9xIaBK7pMvmICUdqImmJQQjh80ldylRG50KOy7sSkuZwWVpxUzpTrJW0vtn6Nr0"
                />
              </Link>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}
