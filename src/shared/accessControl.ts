export type AppRole = 'Super Admin' | 'Admin' | 'Manager' | 'Sales Executive' | 'Telecaller'

export type ModuleKey = 'LEADS' | 'REPORTS' | 'ANALYTICS' | 'BILLING' | 'TEAM' | 'SETTINGS' | 'SECURITY'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: AppRole
  teams?: string[]
}

export const dummyCredentials: Array<{
  name: string
  email: string
  password: string
  role: AppRole
}> = [
  { name: 'Super Admin', email: 'panacea.2126@gmail.com', password: 'Pavan@2001sn.', role: 'Super Admin' },
  { name: 'Admin User', email: 'admin@demo.local', password: 'Admin@123', role: 'Admin' },
  { name: 'Manager User', email: 'manager@demo.local', password: 'Manager@123', role: 'Manager' },
  { name: 'Sales Executive User', email: 'sales@demo.local', password: 'Sales@123', role: 'Sales Executive' },
  { name: 'Telecaller User', email: 'telecaller@demo.local', password: 'Tele@123', role: 'Telecaller' },
]

const roleModules: Record<AppRole, ModuleKey[]> = {
  'Super Admin': ['LEADS', 'REPORTS', 'ANALYTICS', 'BILLING', 'TEAM', 'SETTINGS', 'SECURITY'],
  Admin: ['LEADS', 'REPORTS', 'ANALYTICS', 'BILLING', 'TEAM'],
  Manager: ['LEADS', 'REPORTS', 'ANALYTICS'],
  'Sales Executive': ['LEADS', 'REPORTS'],
  Telecaller: ['LEADS'],
}

export const hasModuleAccess = (role: AppRole, module: ModuleKey) => roleModules[role].includes(module)

export const getDefaultRouteForRole = (role: AppRole) => {
  const normalizedRole = String(role || '').trim() as AppRole

  if (hasModuleAccess(normalizedRole, 'LEADS')) {
    return '/'
  }

  if (hasModuleAccess(normalizedRole, 'REPORTS')) {
    return '/reports'
  }

  if (hasModuleAccess(normalizedRole, 'ANALYTICS')) {
    return '/sales'
  }

  if (hasModuleAccess(normalizedRole, 'BILLING')) {
    return '/billing'
  }

  if (hasModuleAccess(normalizedRole, 'TEAM')) {
    return '/users'
  }

  return '/login'
}

export const getSessionUser = (): SessionUser | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const rawUser = localStorage.getItem('curatorUser')

  if (!rawUser) {
    return null
  }

  try {
    const parsed = JSON.parse(rawUser) as SessionUser

    if (!parsed?.email || !parsed?.role) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const clearSessionData = () => {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem('curatorUser')
  sessionStorage.clear()
  window.dispatchEvent(new Event('curator-session-changed'))
}
