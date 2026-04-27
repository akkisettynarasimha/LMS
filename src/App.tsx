import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type { ChangeEvent, FormEvent, ReactElement } from 'react'
import './App.css'
import * as XLSX from 'xlsx'

import { Shell } from './components/layout/Shell'
import { BillingPage } from './components/pages/BillingPage'
import { DashboardPage as DashboardPageView } from './components/pages/DashboardPage'
import { LeadsPage as LeadsPageView } from './components/pages/LeadsPage'
import { InviteUserPage } from './components/pages/InviteUserPage'
import { ProfilePage } from './components/pages/ProfilePage'
import { ReportsPage as ReportsPageView } from './components/pages/ReportsPage'
import { RolesPermissionsPage } from './components/pages/RolesPermissionsPage'
import { SalesPage } from './components/pages/SalesPage'
import { SettingsPage } from './components/pages/SettingsPage'
import { UsersPage } from './components/pages/UsersPage'
import { dummyCredentials, getDefaultRouteForRole, getSessionUser, hasModuleAccess } from './shared/accessControl'
import { defaultLeadStatuses } from './shared/crmTypes'
import type { Lead, LeadStatus, User } from './shared/crmTypes'
import { leadSourceOptions } from './shared/crmData'

type BulkUploadModalProps = {
  isOpen: boolean
  onClose: () => void
  onUploaded: () => Promise<void> | void
}

function BulkUploadModal({ isOpen, onClose, onUploaded }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  const normalizeImportKey = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')

  const readSpreadsheetField = (row: Record<string, unknown>, aliases: string[]) => {
    const aliasSet = new Set(aliases.map(normalizeImportKey))
    const entry = Object.entries(row).find(([key]) => aliasSet.has(normalizeImportKey(String(key))))
    return String(entry?.[1] ?? '').trim()
  }

  const parsedRows = useMemo(() => {
    return rows.map((row) => {
      const name = readSpreadsheetField(row, ['name', 'full name', 'full_name', 'lead name'])
      const email = readSpreadsheetField(row, ['email', 'email address', 'e-mail', 'mail']).toLowerCase()
      const phone = readSpreadsheetField(row, ['phone', 'phone number', 'mobile', 'contact number'])
      const companyName = readSpreadsheetField(row, ['company', 'company name', 'organization'])
      const source = readSpreadsheetField(row, ['source', 'lead source', 'channel']).toLowerCase() || 'manual'
      const leadType = readSpreadsheetField(row, ['lead type', 'type', 'lead_type']).toLowerCase() || 'warm'
      const budgetRaw = readSpreadsheetField(row, ['budget', 'budget ($)', 'budget_usd'])
      const notes = readSpreadsheetField(row, ['notes', 'requirement notes', 'requirements', 'description'])
      const status = readSpreadsheetField(row, ['status', 'stage', 'lead status'])
      const budget = Number.parseFloat(String(budgetRaw).replace(/[^0-9.]/g, ''))

      return {
        name,
        email,
        phone,
        companyName,
        source,
        leadType,
        budget: Number.isFinite(budget) ? budget : 0,
        notes,
        status,
        isValid: Boolean(name && email),
      }
    })
  }, [rows])

  const validRows = useMemo(
    () => parsedRows.filter((row) => row.isValid).map(({ isValid, ...lead }) => lead),
    [parsedRows],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      setRows([])
      setUploading(false)
      setUploadError('')
      setUploadSuccess('')
    }
  }, [isOpen])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null
    setFile(selectedFile)
    setUploadError('')
    setUploadSuccess('')

    if (!selectedFile) {
      setRows([])
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      try {
        const workbook = XLSX.read(loadEvent.target?.result, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        setRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet))
      } catch {
        setRows([])
        setUploadError('Could not read the selected file. Please upload a valid Excel sheet.')
      }
    }
    reader.readAsArrayBuffer(selectedFile)
  }

  const handleUpload = async () => {
    if (!file || rows.length === 0) {
      setUploadError('Please select a valid Excel file first')
      return
    }

    if (validRows.length === 0) {
      setUploadError('No valid rows found. Ensure your file has name and email columns.')
      return
    }

    try {
      setUploading(true)
      setUploadError('')
      setUploadSuccess('')

      const chunkSize = 250
      let importedCount = 0
      let skippedCount = 0

      for (let start = 0; start < validRows.length; start += chunkSize) {
        const batch = validRows.slice(start, start + chunkSize)
        const response = await fetch('/api/leads/bulk/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ leads: batch }),
        })

        const data = await response.json()
        if (!response.ok) {
          const failedBatch = Math.floor(start / chunkSize) + 1
          throw new Error(data.message || `Failed to upload batch ${failedBatch}`)
        }

        const batchImported = Number(data.total || 0)
        const batchSkipped = Number(data.skipped || 0)

        importedCount += Number.isFinite(batchImported) ? batchImported : 0
        skippedCount += Number.isFinite(batchSkipped) ? batchSkipped : 0
      }

      setUploadSuccess(
        skippedCount > 0
          ? `Successfully imported ${importedCount} leads. Skipped ${skippedCount} duplicate/invalid row(s).`
          : `Successfully imported ${importedCount} leads!`,
      )
      setFile(null)
      setRows([])
      await onUploaded()
      window.setTimeout(() => onClose(), 1500)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload leads'
      setUploadError(message)
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel bulk-upload-modal">
        <div className="modal-head">
          <div>
            <p className="section-kicker">Bulk import</p>
            <h3>Upload leads from Excel</h3>
            <p>Choose a spreadsheet and import the rows directly into the CRM.</p>
          </div>
          <button type="button" className="square-btn" onClick={onClose} aria-label="Close upload modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <label className="upload-dropzone">
          <span className="material-symbols-outlined">upload_file</span>
          <strong>{file ? file.name : 'Select an .xlsx or .xls file'}</strong>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        </label>

        {uploadError ? <div className="dashboard-banner error">{uploadError}</div> : null}
        {uploadSuccess ? <div className="dashboard-banner info">{uploadSuccess}</div> : null}

        <div className="bulk-upload-preview">
          <div className="panel-head-row">
            <div>
              <h4>Preview</h4>
              <p>
                {rows.length > 0
                  ? `${validRows.length} valid row(s), ${Math.max(rows.length - validRows.length, 0)} invalid row(s)`
                  : 'No rows loaded yet'}
              </p>
            </div>
          </div>

          <p className="subtle-copy">Accepted columns: Full Name, Email Address, Phone Number, Company Name, Source, Lead Type, Budget ($), Requirement Notes, Status</p>

          <div className="bulk-upload-table">
            {rows.slice(0, 5).length > 0 ? (
              <table>
                <thead>
                  <tr>
                    {Object.keys(rows[0]).slice(0, 4).map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, index) => (
                    <tr key={`preview-${index}`}>
                      {Object.values(row)
                        .slice(0, 4)
                        .map((value, valueIndex) => (
                          <td key={`${index}-${valueIndex}`}>{String(value ?? '')}</td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="dashboard-empty-state compact">
                <span className="material-symbols-outlined">description</span>
                <p>Upload a spreadsheet to see a preview before importing.</p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={handleUpload} disabled={uploading || rows.length === 0}>
            {uploading ? 'Uploading...' : 'Upload Leads'}
          </button>
        </div>
      </div>
    </div>
  )
}


type NewLeadModalProps = {
  isOpen: boolean
  onClose: () => void
  onCreated: () => Promise<void> | void
}

function NewLeadModal({ isOpen, onClose, onCreated }: NewLeadModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [source, setSource] = useState('')
  const [leadType, setLeadType] = useState<'hot' | 'warm' | 'cold'>('warm')
  const [budget, setBudget] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<LeadStatus>('new')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setName('')
      setEmail('')
      setPhone('')
      setCompanyName('')
      setSource('')
      setLeadType('warm')
      setBudget('')
      setNotes('')
      setStatus('new')
      setIsSubmitting(false)
      setErrorMessage('')
    }
  }, [isOpen])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name.trim() || !email.trim()) {
      setErrorMessage('Name and email are required')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          source,
          status,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to create lead')
      }

      await onCreated()
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create lead'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="lead-modal-overlay">
      <div className="lead-modal-shell">
        <div className="lead-modal-header">
          <div>
            <h2>Create New Lead</h2>
            <p>Populate the data curator with a fresh prospect entry.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close lead modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form className="lead-modal-body" onSubmit={handleSubmit}>
          <label>
            <span>Full Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Julianne Moore" />
          </label>
          <label>
            <span>Email Address</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="julianne@enterprise.com" />
          </label>
          <label>
            <span>Phone Number</span>
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 (555) 000-0000" />
          </label>
          <label>
            <span>Company Name</span>
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Global Tech Solutions" />
          </label>
          <label>
            <span>Source</span>
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="">Select a source</option>
              {leadSourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="lead-type-group">
            <legend>Lead Type</legend>
            <div className="lead-type-options">
              <button type="button" className={leadType === 'hot' ? 'active-hot' : ''} onClick={() => setLeadType('hot')}>
                <span></span>
                Hot
              </button>
              <button type="button" className={leadType === 'warm' ? 'active-warm' : ''} onClick={() => setLeadType('warm')}>
                <span></span>
                Warm
              </button>
              <button type="button" className={leadType === 'cold' ? 'active-cold' : ''} onClick={() => setLeadType('cold')}>
                <span></span>
                Cold
              </button>
            </div>
          </fieldset>

          <label className="full-width">
            <span>Budget ($)</span>
            <input type="number" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="50,000" />
          </label>

          <label className="full-width">
            <span>Requirement Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Describe the lead's specific needs or business objectives..."
              rows={4}
            />
          </label>

          <label className="full-width">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as LeadStatus)}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="follow_up">Follow-up</option>
              <option value="qualified">Qualified</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="negotiation">Negotiation</option>
              <option value="done">Done</option>
            </select>
          </label>

          {errorMessage ? <p className="modal-error">{errorMessage}</p> : null}

          <div className="lead-modal-footer full-width">
            <button type="button" className="ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()

    // Support quick paste patterns like: "user@demo.local / Password@123"
    const pastedParts = normalizedEmail.split('/').map((part) => part.trim())
    const parsedEmail = pastedParts.length > 1 ? pastedParts[0] : normalizedEmail
    const parsedPassword = pastedParts.length > 1 ? pastedParts[1] || normalizedPassword : normalizedPassword

    const matchedDummy = dummyCredentials.find(
      (credential) =>
        credential.email === parsedEmail &&
        credential.password === parsedPassword,
    )

    if (matchedDummy) {
      const sessionUser = {
        id: matchedDummy.email,
        name: matchedDummy.name,
        email: matchedDummy.email,
        role: matchedDummy.role,
        teams: [matchedDummy.role],
      }

      localStorage.setItem(
        'curatorUser',
        JSON.stringify(sessionUser),
      )
      window.dispatchEvent(new Event('curator-session-changed'))
      navigate(getDefaultRouteForRole(matchedDummy.role), { replace: true })
      return
    }

    try {
      setIsSubmitting(true)
      setStatusMessage('')
      setErrorMessage('')

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: parsedEmail, password: parsedPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      localStorage.setItem('curatorUser', JSON.stringify(data.user))
      window.dispatchEvent(new Event('curator-session-changed'))
      setStatusMessage(`Logged in as ${data.user.name} (${data.user.role})`)
      const nextRoute = getDefaultRouteForRole(data.user.role)
      navigate(nextRoute, { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleLogin}>
        <p className="auth-kicker">Curator CRM Access</p>
        <h2>Sign in with your admin or invite email</h2>
        <p className="auth-copy">Use your super admin credentials or the email and password sent by your admin.</p>

        <div className="auth-demo-box">
          <p>Demo logins</p>
          <ul>
            {dummyCredentials.map((credential) => (
              <li key={credential.email}>
                <strong>{credential.role}</strong>
                <span>{credential.email} / {credential.password}</span>
              </li>
            ))}
          </ul>
        </div>

        <label>
          Email Address
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="name@company.com"
            autoComplete="username"
            required
          />
        </label>

        <label>
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>

        {statusMessage ? <p className="auth-status success">{statusMessage}</p> : null}
        {errorMessage ? <p className="auth-status error">{errorMessage}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

function App() {
  const [sessionUser, setSessionUser] = useState(() => getSessionUser())
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)

  const loadLeads = async (options?: { silent?: boolean }) => {
    const shouldShowLoader = !options?.silent

    try {
      setError('')
      if (shouldShowLoader) {
        setLoading(true)
      }

      const response = await fetch('/api/leads')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not load leads')
      }

      setLeads(data)
      setLastSyncedAt(Date.now())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error'
      setError(message)
    } finally {
      if (shouldShowLoader) {
        setLoading(false)
      }
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not load users')
      }

      setUsers(data)
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }

  useEffect(() => {
    void loadLeads()
    void loadUsers()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadLeads({ silent: true })
    }, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const syncSessionUser = () => {
      setSessionUser(getSessionUser())
    }

    syncSessionUser()
    window.addEventListener('curator-session-changed', syncSessionUser)
    window.addEventListener('storage', syncSessionUser)

    return () => {
      window.removeEventListener('curator-session-changed', syncSessionUser)
      window.removeEventListener('storage', syncSessionUser)
    }
  }, [])

  const metrics = useMemo(() => {
    const total = leads.length
    const newLeads = leads.filter((lead) => lead.status === 'new').length
    const converted = leads.filter((lead) => lead.status === 'qualified').length
    const contacted = leads.filter((lead) => lead.status === 'contacted').length
    const lost = Math.max(0, Math.round(total * 0.06))
    const followUps = contacted + Math.round(newLeads * 0.25)
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0'

    return {
      total,
      newLeads,
      converted,
      contacted,
      followUps,
      lost,
      conversionRate,
    }
  }, [leads])

  const sourceBreakdown = useMemo(() => {
    const sourceCounts = new Map<string, number>()
    leads.forEach((lead) => {
      const label = leadSourceOptions.find((option) => option.value === lead.source)?.label || 'Manual Entry'
      sourceCounts.set(label, (sourceCounts.get(label) || 0) + 1)
    })

    const total = Math.max(leads.length, 1)
    const tones = ['source-primary', 'source-secondary', 'source-tertiary', 'source-accent', 'source-muted']

    return Array.from(sourceCounts.entries())
      .map(([label, count], index) => ({
        label,
        count,
        percent: Number(((count / total) * 100).toFixed(0)),
        tone: tones[index % tones.length],
      }))
      .sort((left, right) => right.count - left.count)
  }, [leads])

  const stageBreakdown = useMemo(() => {
    const toStatusLabel = (status: string) =>
      status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())

    const stageOrder: LeadStatus[] = [...defaultLeadStatuses]
    const customStatuses = Array.from(new Set(leads.map((lead) => String(lead.status || '').trim().toLowerCase())))
      .filter((status) => Boolean(status) && !stageOrder.includes(status as LeadStatus))

    stageOrder.push(...customStatuses)
    const tones = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-accent', 'bg-muted']
    const total = Math.max(leads.length, 1)

    return stageOrder.map((status, index) => {
      const count = leads.filter((lead) => lead.status === status).length
      return {
        label: toStatusLabel(status),
        count,
        percent: Number(((count / total) * 100).toFixed(0)),
        tone: tones[index % tones.length],
      }
    })
  }, [leads])

  const recentLeads = leads.slice(0, 3)

  const moveLeadStatus = async (leadId: string, nextStatus: LeadStatus) => {
    const existingLead = leads.find((lead) => lead._id === leadId)
    if (!existingLead || existingLead.status === nextStatus) {
      return
    }

    setLeads((current) => current.map((lead) => (lead._id === leadId ? { ...lead, status: nextStatus } : lead)))

    try {
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Could not update lead status')
      }

      setLeads((current) => current.map((lead) => (lead._id === leadId ? { ...lead, status: data.status } : lead)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update lead status'
      const isServerStatusValidationIssue = /invalid status value/i.test(message)

      if (isServerStatusValidationIssue) {
        setError('Lead moved locally. Restart backend to persist custom stages like Done / Not Connected.')
        return
      }

      setError(message)
      setLeads((current) => current.map((lead) => (lead._id === leadId ? { ...lead, status: existingLead.status } : lead)))
    }
  }

  const assignLead = async (leadId: string, userId: string | null) => {
    const existingLead = leads.find((lead) => lead._id === leadId)
    if (!existingLead) {
      return
    }

    setLeads((current) => current.map((lead) => (lead._id === leadId ? { ...lead, assignedTo: userId || undefined } : lead)))

    try {
      const response = await fetch(`/api/leads/${leadId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignedTo: userId }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Could not assign lead')
      }

      setLeads((current) => current.map((lead) => (lead._id === leadId ? { ...lead, assignedTo: data.assignedTo } : lead)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not assign lead'
      setError(message)
      setLeads((current) => current.map((lead) => (lead._id === leadId ? { ...lead, assignedTo: existingLead.assignedTo } : lead)))
    }
  }

  const downloadLeadTemplate = () => {
    const templateRows = [
      {
        'Full Name': 'Julianne Moore',
        'Email Address': 'julianne@enterprise.com',
        'Phone Number': '+1 (555) 000-0000',
        'Company Name': 'Global Tech Solutions',
        Source: 'google_ads',
        'Lead Type': 'Hot',
        'Budget ($)': '50,000',
        'Requirement Notes': "Describe the lead's specific needs or business objectives...",
        Status: 'New',
      },
      {
        'Full Name': 'Jane Smith',
        'Email Address': 'jane.smith@example.com',
        'Phone Number': '+1 (555) 111-2222',
        'Company Name': 'Acme Corp',
        Source: 'referral',
        'Lead Type': 'Warm',
        'Budget ($)': '25,000',
        'Requirement Notes': 'Need CRM integration and onboarding support.',
        Status: 'Contacted',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')
    XLSX.writeFile(workbook, 'lead-upload-template.xlsx')
  }

  const protectRoute = (module: 'LEADS' | 'REPORTS' | 'ANALYTICS' | 'BILLING' | 'TEAM' | 'SETTINGS', element: ReactElement) => {
    if (!sessionUser) {
      return <Navigate to="/login" replace />
    }

    if (!hasModuleAccess(sessionUser.role, module)) {
      return <Navigate to={getDefaultRouteForRole(sessionUser.role)} replace />
    }

    return element
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={protectRoute(
            'LEADS',
            <Shell
              pageTitle="Curator CRM"
              searchPlaceholder="Search leads, data, or reports..."
              onNewLead={() => setIsLeadModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            >
              <DashboardPageView
                error={error}
                loading={loading}
                metrics={metrics}
                recentLeads={recentLeads}
                sourceBreakdown={sourceBreakdown}
                stageBreakdown={stageBreakdown}
                lastSyncedAt={lastSyncedAt}
                onRefresh={() => loadLeads({ silent: true })}
              />
            </Shell>,
          )}
        />
        <Route
          path="/leads"
          element={protectRoute(
            'LEADS',
            <Shell
              pageTitle="The Data Curator"
              searchPlaceholder="Global Lead Search..."
              onNewLead={() => setIsLeadModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            >
              <LeadsPageView 
                leads={leads} 
                onMoveLead={moveLeadStatus} 
                onAssignLead={assignLead}
                users={users}
                searchQuery={searchQuery} 
                onBulkUpload={() => setIsBulkUploadOpen(true)} 
                onDownloadTemplate={downloadLeadTemplate}
              />
            </Shell>,
          )}
        />
        <Route
          path="/reports"
          element={protectRoute(
            'REPORTS',
            <Shell
              pageTitle="The Data Curator"
              searchPlaceholder="Global search..."
              onNewLead={() => setIsLeadModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            >
              <ReportsPageView metrics={metrics} />
            </Shell>,
          )}
        />
        <Route
          path="/sales"
          element={protectRoute(
            'ANALYTICS',
            <Shell
              pageTitle="Sales Intelligence"
              searchPlaceholder="Search opportunities, accounts, or analytics..."
              onNewLead={() => setIsLeadModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            >
              <SalesPage />
            </Shell>,
          )}
        />
        <Route
          path="/billing"
          element={protectRoute(
            'BILLING',
            <Shell
              pageTitle="Billing Intelligence"
              searchPlaceholder="Search invoices, accounts, or collections..."
              onNewLead={() => setIsLeadModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            >
              <BillingPage />
            </Shell>,
          )}
        />
        <Route
          path="/profile"
          element={protectRoute(
            'SETTINGS',
            <Shell
              pageTitle="Profile Settings"
              searchPlaceholder="Search profile settings..."
              onNewLead={() => setIsLeadModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            >
              <ProfilePage />
            </Shell>,
          )}
        />
        <Route
          path="/settings"
          element={protectRoute(
            'SETTINGS',
            <Shell
              pageTitle="Global Settings"
              searchPlaceholder="Search settings..."
              onNewLead={() => setIsLeadModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            >
              <SettingsPage />
            </Shell>,
          )}
        />
        <Route path="/login" element={sessionUser ? <Navigate to={getDefaultRouteForRole(sessionUser.role)} replace /> : <LoginPage />} />
        <Route
          path="/users"
          element={protectRoute(
            'TEAM',
            <Shell
              pageTitle="The Data Curator"
              searchPlaceholder="Search team members..."
              onNewLead={() => setIsLeadModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            >
              <UsersPage />
            </Shell>,
          )}
        />
        <Route
          path="/users/invite"
          element={protectRoute(
            'TEAM',
            <Shell
              pageTitle="Nexus CRM"
              searchPlaceholder="Search team members..."
              onNewLead={() => setIsLeadModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            >
              <InviteUserPage />
            </Shell>,
          )}
        />
        <Route
          path="/users/roles-permissions"
          element={protectRoute(
            'TEAM',
            <Shell
              pageTitle="Nexus Enterprise"
              searchPlaceholder="Search roles..."
              onNewLead={() => setIsLeadModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            >
              <RolesPermissionsPage />
            </Shell>,
          )}
        />
      </Routes>

      <NewLeadModal isOpen={isLeadModalOpen} onClose={() => setIsLeadModalOpen(false)} onCreated={loadLeads} />
      <BulkUploadModal isOpen={isBulkUploadOpen} onClose={() => setIsBulkUploadOpen(false)} onUploaded={loadLeads} />
    </>
  )
}

export default App
