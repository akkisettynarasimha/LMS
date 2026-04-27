import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'

type SecuritySettings = {
  twoFARequired: boolean
  ssoEnabled: boolean
  ipWhitelisting: boolean
}

type AppSettings = {
  companyName: string
  website: string
  industry: string
  headquartersAddress: string
  primaryBrandColor: string
  logoDataUrl: string
  faviconDataUrl: string
  billingPlan: string
  billingSummary: string
  nextPaymentDate: string
  security: SecuritySettings
  lastExportText: string
}

const defaultSettings: AppSettings = {
  companyName: 'Acme Global Industries',
  website: 'https://acme-global.io',
  industry: 'SaaS Enterprise',
  headquartersAddress: 'One World Trade Center, NY',
  primaryBrandColor: '#0059BB',
  logoDataUrl: '',
  faviconDataUrl: '',
  billingPlan: 'Enterprise Plan',
  billingSummary: 'Unlimited Curators • Priority Support',
  nextPaymentDate: 'Oct 12, 2024',
  security: {
    twoFARequired: true,
    ssoEnabled: false,
    ipWhitelisting: false,
  },
  lastExportText: 'Last full export: 2 days ago',
}

const normalizeSettings = (payload: Partial<AppSettings> | null | undefined): AppSettings => ({
  companyName: payload?.companyName || defaultSettings.companyName,
  website: payload?.website || defaultSettings.website,
  industry: payload?.industry || defaultSettings.industry,
  headquartersAddress: payload?.headquartersAddress || defaultSettings.headquartersAddress,
  primaryBrandColor: payload?.primaryBrandColor || defaultSettings.primaryBrandColor,
  logoDataUrl: payload?.logoDataUrl || defaultSettings.logoDataUrl,
  faviconDataUrl: payload?.faviconDataUrl || defaultSettings.faviconDataUrl,
  billingPlan: payload?.billingPlan || defaultSettings.billingPlan,
  billingSummary: payload?.billingSummary || defaultSettings.billingSummary,
  nextPaymentDate: payload?.nextPaymentDate || defaultSettings.nextPaymentDate,
  security: {
    twoFARequired: Boolean(payload?.security?.twoFARequired),
    ssoEnabled: Boolean(payload?.security?.ssoEnabled),
    ipWhitelisting: Boolean(payload?.security?.ipWhitelisting),
  },
  lastExportText: payload?.lastExportText || defaultSettings.lastExportText,
})

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
      throw new Error('Settings API returned HTML instead of JSON.')
    }

    throw new Error('Settings API returned an invalid response format.')
  }
}

const settingsHostCandidate = typeof window !== 'undefined' ? window.location.hostname : 'localhost'

const SETTINGS_ENDPOINTS = Array.from(
  new Set([
    'http://localhost:5000/api/settings',
    'http://127.0.0.1:5000/api/settings',
    `http://${settingsHostCandidate}:5000/api/settings`,
    '/api/settings',
  ]),
)

const requestSettingsApi = async (method: 'GET' | 'PUT', body?: AppSettings) => {
  let lastError: Error | null = null
  const attemptedEndpoints: string[] = []

  for (const endpoint of SETTINGS_ENDPOINTS) {
    attemptedEndpoints.push(endpoint)
    try {
      const response = await fetch(endpoint, {
        method,
        cache: 'no-store',
        headers: method === 'PUT' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'PUT' ? JSON.stringify(body) : undefined,
      })

      const data = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`)
      }

      return data
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error('Settings request failed')
      // If an endpoint serves SPA HTML, continue trying remaining endpoints.
      if (normalized.message.includes('returned HTML')) {
        lastError = normalized
        continue
      }
      lastError = normalized
    }
  }

  const fallbackMessage = `Settings save failed after trying: ${attemptedEndpoints.join(', ')}. Ensure backend is running on port 5000.`
  throw lastError || new Error(fallbackMessage)
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('File upload failed'))
    }
    reader.onerror = () => reject(new Error('File upload failed'))
    reader.readAsDataURL(file)
  })

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [savedSnapshot, setSavedSnapshot] = useState<AppSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await requestSettingsApi('GET')

        const normalized = normalizeSettings(data)
        setSettings(normalized)
        setSavedSnapshot(normalized)
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load settings'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSnapshot), [savedSnapshot, settings])

  const updateField = <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
    setSuccessMessage('')
    setSettings((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const updateSecurity = (field: keyof SecuritySettings, value: boolean) => {
    setSuccessMessage('')
    setSettings((current) => ({
      ...current,
      security: {
        ...current.security,
        [field]: value,
      },
    }))
  }

  const handleAssetUpload = async (assetType: 'logoDataUrl' | 'faviconDataUrl', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.')
      event.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Please upload an image smaller than 2MB.')
      event.target.value = ''
      return
    }

    try {
      setError('')
      const dataUrl = await readFileAsDataUrl(file)
      updateField(assetType, dataUrl)
    } catch {
      setError('Unable to process uploaded image. Try another file.')
    } finally {
      event.target.value = ''
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccessMessage('')

      const data = await requestSettingsApi('PUT', settings)

      const normalized = normalizeSettings(data.settings)
      setSettings(normalized)
      setSavedSnapshot(normalized)
      window.dispatchEvent(new Event('crm-settings-updated'))
      setSuccessMessage('Settings saved successfully')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save settings'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setSettings(savedSnapshot)
    setError('')
    setSuccessMessage('Changes discarded')
  }

  return (
    <div className="settings-page">
      <section className="settings-hero">
        <h1>Global Settings</h1>
        <p>Manage your enterprise environment and brand identity.</p>
      </section>

      {error ? <p className="settings-notice error">{error}</p> : null}
      {successMessage ? <p className="settings-notice success">{successMessage}</p> : null}
      {loading ? <p className="settings-notice info">Loading settings...</p> : null}

      <div className="settings-grid">
        <section className="settings-main-stack">
          <article className="settings-card">
            <div className="settings-card-head">
              <div className="settings-icon-wrap primary">
                <span className="material-symbols-outlined">business</span>
              </div>
              <h3>Company Profile</h3>
            </div>

            <div className="settings-form-grid">
              <label>
                <span>Company Name</span>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(event) => updateField('companyName', event.target.value)}
                  disabled={loading || saving}
                />
              </label>

              <label>
                <span>Website</span>
                <input
                  type="text"
                  value={settings.website}
                  onChange={(event) => updateField('website', event.target.value)}
                  disabled={loading || saving}
                />
              </label>

              <label>
                <span>Industry</span>
                <select
                  value={settings.industry}
                  onChange={(event) => updateField('industry', event.target.value)}
                  disabled={loading || saving}
                >
                  <option>SaaS Enterprise</option>
                  <option>Fintech</option>
                  <option>Healthcare</option>
                </select>
              </label>

              <label>
                <span>Headquarters Address</span>
                <input
                  type="text"
                  value={settings.headquartersAddress}
                  onChange={(event) => updateField('headquartersAddress', event.target.value)}
                  disabled={loading || saving}
                />
              </label>
            </div>
          </article>

          <article className="settings-card">
            <div className="settings-card-head">
              <div className="settings-icon-wrap secondary">
                <span className="material-symbols-outlined">brush</span>
              </div>
              <h3>Branding & White-labeling</h3>
            </div>

            <div className="settings-branding-layout">
              <div className="settings-branding-controls">
                <div className="settings-upload-group">
                  <p>Asset Management</p>
                  <div className="settings-upload-row">
                    <label className="settings-upload-box large" htmlFor="settings-logo-upload">
                      <span className="material-symbols-outlined">upload_file</span>
                      <span>{settings.logoDataUrl ? 'Replace Main Logo' : 'Main Logo'}</span>
                      <input
                        id="settings-logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handleAssetUpload('logoDataUrl', event)}
                        disabled={loading || saving}
                      />
                    </label>
                    <label className="settings-upload-box small" htmlFor="settings-favicon-upload">
                      <span className="material-symbols-outlined">image</span>
                      <span>{settings.faviconDataUrl ? 'Replace Favicon' : 'Favicon'}</span>
                      <input
                        id="settings-favicon-upload"
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handleAssetUpload('faviconDataUrl', event)}
                        disabled={loading || saving}
                      />
                    </label>
                  </div>
                </div>

                <div className="settings-color-group">
                  <p>Primary Brand Color</p>
                  <div className="settings-color-row">
                    <button
                      type="button"
                      className="settings-color-dot"
                      style={{ background: settings.primaryBrandColor }}
                      aria-label="Primary color preview"
                    ></button>
                    <input
                      type="text"
                      value={settings.primaryBrandColor}
                      onChange={(event) => updateField('primaryBrandColor', event.target.value)}
                      disabled={loading || saving}
                    />
                  </div>
                </div>
              </div>

              <aside className="settings-preview-card">
                <p>Live Preview</p>
                <div className="settings-preview-topbar" style={{ background: `linear-gradient(90deg, ${settings.primaryBrandColor}, #233a66)` }}></div>
                <div className="settings-preview-brand">
                  {settings.logoDataUrl ? <img src={settings.logoDataUrl} alt="Company logo preview" /> : <span>Logo</span>}
                  <strong>{settings.companyName || 'Company Name'}</strong>
                </div>
                <div className="settings-preview-actions">
                  <span>Action Button</span>
                  <span className="ghost">Secondary</span>
                </div>
                <div className="settings-preview-line"></div>
              </aside>
            </div>
          </article>
        </section>

        <aside className="settings-side-stack">
          <article className="settings-billing-card">
            <p>Billing Summary</p>
            <h4>{settings.billingPlan}</h4>
            <span>{settings.billingSummary}</span>
            <div className="settings-billing-row">
              <small>Next Payment</small>
              <strong>{settings.nextPaymentDate}</strong>
            </div>
            <button type="button" disabled={loading || saving}>Manage Billing</button>
          </article>

          <article className="settings-card">
            <h3>Security & Access</h3>
            <div className="settings-toggle-list">
              <div>
                <div>
                  <p>2FA Required</p>
                  <small>Mandatory for all members</small>
                </div>
                <button
                  type="button"
                  className={`settings-toggle ${settings.security.twoFARequired ? 'on' : ''}`}
                  aria-label="2FA toggle"
                  onClick={() => updateSecurity('twoFARequired', !settings.security.twoFARequired)}
                  disabled={loading || saving}
                ></button>
              </div>

              <div>
                <div>
                  <p>SSO Integration</p>
                  <small>SAML 2.0 / Okta</small>
                </div>
                <button
                  type="button"
                  className={`settings-toggle ${settings.security.ssoEnabled ? 'on' : ''}`}
                  aria-label="SSO toggle"
                  onClick={() => updateSecurity('ssoEnabled', !settings.security.ssoEnabled)}
                  disabled={loading || saving}
                ></button>
              </div>

              <div>
                <div>
                  <p>IP Whitelisting</p>
                  <small>Restricted access by IP</small>
                </div>
                <button
                  type="button"
                  className={`settings-toggle ${settings.security.ipWhitelisting ? 'on' : ''}`}
                  aria-label="IP whitelist toggle"
                  onClick={() => updateSecurity('ipWhitelisting', !settings.security.ipWhitelisting)}
                  disabled={loading || saving}
                ></button>
              </div>
            </div>
          </article>

          <article className="settings-card settings-data-card">
            <h3>Data Management</h3>
            <button type="button" className="settings-action-row">
              <span>
                <i className="material-symbols-outlined">download</i>
                Export All Data
              </span>
              <i className="material-symbols-outlined">chevron_right</i>
            </button>
            <button type="button" className="settings-action-row">
              <span>
                <i className="material-symbols-outlined">key</i>
                API Key Management
              </span>
              <i className="material-symbols-outlined">chevron_right</i>
            </button>
            <small>{settings.lastExportText}</small>
          </article>
        </aside>
      </div>

      <footer className="settings-footer-actions">
        <button
          type="button"
          className="settings-discard-btn"
          onClick={handleDiscard}
          disabled={!isDirty || loading || saving}
        >
          Discard Changes
        </button>
        <button
          type="button"
          className="settings-save-btn"
          onClick={handleSave}
          disabled={!isDirty || loading || saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </footer>
    </div>
  )
}
