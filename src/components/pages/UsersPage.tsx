import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type UserRecord = {
  id: string
  name: string
  email: string
  role: string
  teams: string[]
  active: boolean
  invitedAt?: string
  lastLoginAt?: string | null
}

const roleToneMap: Record<string, string> = {
  'Super Admin': 'role-admin',
  Admin: 'role-admin',
  Manager: 'role-manager',
  'Sales Executive': 'role-executive',
  Telecaller: 'role-telecaller',
}

const USERS_API_BASES = ['/api', 'http://localhost:5000/api']

const parseApiResponse = async (response: Response) => {
  const raw = await response.text()
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return raw ? JSON.parse(raw) : {}
  }

  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw)
  } catch {
    const looksLikeHtml = raw.trimStart().startsWith('<!DOCTYPE') || raw.trimStart().startsWith('<html')
    if (looksLikeHtml) {
      throw new Error('Users API returned HTML instead of JSON. Ensure backend is running and /api routes are reachable.')
    }

    throw new Error('Users API returned an invalid response format.')
  }
}

const requestUsersApi = async (path: string, init?: RequestInit) => {
  let lastError: Error | null = null

  for (const base of USERS_API_BASES) {
    try {
      const response = await fetch(`${base}${path}`, init)
      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`)
      }

      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Users API request failed')
    }
  }

  throw lastError || new Error('Users API is unavailable')
}

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')

      const query = new URLSearchParams()
      if (searchText.trim()) query.set('search', searchText.trim())
      if (roleFilter !== 'all') query.set('role', roleFilter)
      if (activeFilter !== 'all') query.set('active', activeFilter === 'active' ? 'true' : 'false')

      const data = await requestUsersApi(`/users${query.toString() ? `?${query.toString()}` : ''}`)

      setUsers(Array.isArray(data) ? data : [])
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Unable to load users'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [roleFilter, activeFilter, searchText])

  const teamsCount = useMemo(() => {
    const unique = new Set<string>()
    users.forEach((user) => (user.teams || []).forEach((team) => unique.add(team)))
    return unique.size
  }, [users])

  const activateUser = async (userId: string, nextActive: boolean) => {
    try {
      setBusyUserId(userId)
      setError('')

      const data = await requestUsersApi(`/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: nextActive }),
      })

      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, active: data.active } : user)))
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Unable to update user status'
      setError(message)
    } finally {
      setBusyUserId(null)
    }
  }

  const removeUser = async (userId: string) => {
    try {
      setBusyUserId(userId)
      setError('')

      await requestUsersApi(`/users/${userId}`, {
        method: 'DELETE',
      })

      setUsers((current) => current.filter((user) => user.id !== userId))
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Unable to delete user'
      setError(message)
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <div className="users-modern-wrap">
      <section className="users-modern-hero">
        <div>
          <span className="users-modern-kicker">User administration</span>
          <h2>Workspace Access Control</h2>
          <p>Manage team members, roles, and live account status from one place.</p>
        </div>

        <div className="users-modern-actions">
          <Link to="/users/roles-permissions" className="secondary-link">Roles &amp; Permissions</Link>
          <Link to="/users/invite" className="primary-link">
            <span className="material-symbols-outlined">person_add</span>
            Invite User
          </Link>
        </div>
      </section>

      <section className="users-modern-metrics">
        <article>
          <p>Total Users</p>
          <h3>{users.length}</h3>
        </article>
        <article>
          <p>Active Users</p>
          <h3>{users.filter((user) => user.active).length}</h3>
        </article>
        <article>
          <p>Teams</p>
          <h3>{teamsCount}</h3>
        </article>
      </section>

      <section className="users-modern-controls panel">
        <div className="users-modern-filters">
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by name or email"
          />

          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">All Roles</option>
            <option value="Super Admin">Super Admin</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Sales Executive">Sales Executive</option>
            <option value="Telecaller">Telecaller</option>
          </select>

          <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as 'all' | 'active' | 'inactive')}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button type="button" onClick={() => void loadUsers()}>
            <span className="material-symbols-outlined">refresh</span>
            Refresh
          </button>
        </div>
      </section>

      {error ? <div className="dashboard-banner error">{error}</div> : null}
      {loading ? <div className="dashboard-banner info">Loading users...</div> : null}

      <section className="users-modern-grid">
        {users.map((user) => (
          <article className="users-modern-card" key={user.id}>
            <div className="users-modern-card-head">
              <div className="member-cell">
                <div className="member-avatar">{user.name.charAt(0).toUpperCase()}</div>
                <div>
                  <p>{user.name}</p>
                  <span>{user.email}</span>
                </div>
              </div>

              <span className={`role-pill ${roleToneMap[user.role] || 'role-manager'}`}>{user.role}</span>
            </div>

            <div className="users-modern-meta">
              <small>Teams: {(user.teams || []).length ? user.teams.join(', ') : 'Unassigned'}</small>
              <small>
                Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
              </small>
            </div>

            <div className="users-modern-foot">
              <span className={user.active ? 'status-on' : 'status-off'}>
                <i></i>
                {user.active ? 'Active' : 'Inactive'}
              </span>

              <div className="users-modern-row-actions">
                <button
                  type="button"
                  disabled={busyUserId === user.id}
                  onClick={() => {
                    void activateUser(user.id, !user.active)
                  }}
                >
                  {user.active ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={busyUserId === user.id}
                  onClick={() => {
                    void removeUser(user.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {!loading && users.length === 0 ? (
        <div className="users-modern-empty panel">
          <span className="material-symbols-outlined">group_off</span>
          <h4>No users found</h4>
          <p>Try adjusting filters or invite new users to get started.</p>
        </div>
      ) : null}
    </div>
  )
}
