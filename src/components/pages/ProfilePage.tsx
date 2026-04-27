import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSessionData, getSessionUser } from '../../shared/accessControl'

export function ProfilePage() {
  const navigate = useNavigate()
  const sessionUser = getSessionUser()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const fullNameInputRef = useRef<HTMLInputElement | null>(null)

  const profileStorageKey = useMemo(() => {
    const identity = sessionUser?.id || sessionUser?.email || 'guest'
    return `curator-profile:${identity}`
  }, [sessionUser?.id, sessionUser?.email])

  const baseProfile = useMemo(
    () => ({
      role: sessionUser?.role || 'Admin',
      fullName: sessionUser?.name || 'User',
      email: sessionUser?.email || '',
      phone: '+1 (555) 234-8890',
      jobTitle: 'Director of Revenue Operations',
      department: 'Strategic Sales & Enterprise Growth',
    }),
    [sessionUser?.email, sessionUser?.name, sessionUser?.role],
  )

  useEffect(() => {
    const storedProfile = localStorage.getItem(profileStorageKey)

    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile) as {
          fullName?: string
          email?: string
          phone?: string
          jobTitle?: string
          department?: string
        }

        setFullName(parsed.fullName || baseProfile.fullName)
        setEmail(parsed.email || baseProfile.email)
        setPhone(parsed.phone || baseProfile.phone)
        setJobTitle(parsed.jobTitle || baseProfile.jobTitle)
        setDepartment(parsed.department || baseProfile.department)
        return
      } catch {
        localStorage.removeItem(profileStorageKey)
      }
    }

    setFullName(baseProfile.fullName)
    setEmail(baseProfile.email)
    setPhone(baseProfile.phone)
    setJobTitle(baseProfile.jobTitle)
    setDepartment(baseProfile.department)
  }, [baseProfile, profileStorageKey])

  const handleSignOut = () => {
    clearSessionData()
    navigate('/login', { replace: true })
  }

  const handleSaveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextProfile = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      jobTitle: jobTitle.trim(),
      department: department.trim(),
    }

    if (!nextProfile.fullName || !nextProfile.email) {
      setSaveError('Full name and email are required')
      setSaveMessage('')
      return
    }

    localStorage.setItem(profileStorageKey, JSON.stringify(nextProfile))

    if (sessionUser) {
      localStorage.setItem(
        'curatorUser',
        JSON.stringify({
          ...sessionUser,
          name: nextProfile.fullName,
          email: nextProfile.email,
        }),
      )
      window.dispatchEvent(new Event('curator-session-changed'))
    }

    setSaveError('')
    setSaveMessage('Profile details updated successfully')
  }

  const handleEditDetails = () => {
    const personalSection = document.getElementById('personal')
    personalSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    window.setTimeout(() => {
      fullNameInputRef.current?.focus()
      fullNameInputRef.current?.select()
    }, 220)
  }

  return (
    <div className="profile-page">
      <main className="profile-content profile-content-only">
        <header className="profile-page-head">
          <div className="profile-page-head-copy">
            <span className="profile-page-kicker">Account Profile</span>
            <h1>Profile Information</h1>
            <p>Manage your account details, security, and notification preferences from one place.</p>
          </div>
        </header>

        <div className="profile-split-layout">
          <aside className="profile-left-tab">
            <div className="profile-left-head">
              <img
                alt="Admin"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCMQAJFENn3DQIaeA_nOYGX2qL-bHcQu05IdQseZfNpSwrtxIqW_JTA9ZEy5iXsfr_uWJipUWetF77GQdkuIkxyhSY0Vt2lG2sbsXVmIeO5B51sdHQapANMx9o_uqp5-1Ex8vbU0z9yj278DmPSPmQL6eg45phXXFSJ0PevPt9LJvSZ9eHm5x6JeU5_pdBhLSL9rlavjTN7oNFj8fvaQzmzx8EqdA2oLhEZnPao2f_ratr69cPCqZXK1vDWkLiDNPNp1EXVEgNgGWW"
              />
              <div>
                <h4 className="profile-role">{baseProfile.role}</h4>
                <h3>{fullName}</h3>
                <p>{jobTitle}</p>
              </div>
            </div>

            <div className="profile-left-status">
              <span className="profile-status-chip">Active</span>
              <span className="profile-status-note">Enterprise account verified</span>
            </div>

            <nav className="profile-left-nav">
              <a href="#personal">Personal Information</a>
              <a href="#security">Security</a>
              <a href="#notifications">Notification Preferences</a>
            </nav>

            <div className="profile-left-summary">
              <div>
                <span>Email</span>
                <strong>{email}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{phone}</strong>
              </div>
              <div>
                <span>Department</span>
                <strong>{department}</strong>
              </div>
            </div>

            <div className="profile-left-details">
              <h5>Quick Actions</h5>
              <div className="profile-quick-actions">
                <button type="button" onClick={handleEditDetails}>Edit Details</button>
                <button type="button">Change Photo</button>
                <button type="button" className="profile-signout-btn" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            </div>
          </aside>

          <div className="profile-right-content">
            <section id="personal" className="profile-section">
              <div className="profile-section-head">
                <h2>Personal Information</h2>
                <p>Manage your public profile and professional details.</p>
              </div>
              <article className="profile-card profile-personal-card">
                <div className="profile-personal-hero">
                  <div className="profile-avatar-row">
                    <img
                      alt="Admin"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCMQAJFENn3DQIaeA_nOYGX2qL-bHcQu05IdQseZfNpSwrtxIqW_JTA9ZEy5iXsfr_uWJipUWetF77GQdkuIkxyhSY0Vt2lG2sbsXVmIeO5B51sdHQapANMx9o_uqp5-1Ex8vbU0z9yj278DmPSPmQL6eg45phXXFSJ0PevPt9LJvSZ9eHm5x6JeU5_pdBhLSL9rlavjTN7oNFj8fvaQzmzx8EqdA2oLhEZnPao2f_ratr69cPCqZXK1vDWkLiDNPNp1EXVEgNgGWW"
                    />
                    <div>
                      <h4 className="profile-role">{baseProfile.role}</h4>
                      <h3>{fullName} Photo</h3>
                      <p>Allowed JPG, GIF or PNG. Max size 800KB.</p>
                    </div>
                  </div>
                </div>
                <form className="profile-form-grid profile-form-grid-modern" onSubmit={handleSaveProfile}>
                  <label>
                    Full Name
                    <input ref={fullNameInputRef} type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} />
                  </label>
                  <label>
                    Email Address
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                  </label>
                  <label>
                    Phone Number
                    <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </label>
                  <label>
                    Job Title
                    <input type="text" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
                  </label>
                  <label className="wide">
                    Department
                    <input type="text" value={department} onChange={(event) => setDepartment(event.target.value)} />
                  </label>

                  {saveError ? <p className="auth-status error wide">{saveError}</p> : null}
                  {saveMessage ? <p className="auth-status success wide">{saveMessage}</p> : null}

                  <button type="submit" className="profile-primary-btn wide">Save Profile Details</button>
                </form>
              </article>
            </section>

            <section id="security" className="profile-section">
              <div className="profile-section-head">
                <h2>Security</h2>
                <p>Update your password and secure your account access.</p>
              </div>
              <article className="profile-card">
                <div className="profile-form-grid">
                  <label>
                    Current Password
                    <input type="password" placeholder="************" autoComplete="current-password" />
                  </label>
                  <label>
                    New Password
                    <input type="password" autoComplete="new-password" />
                  </label>
                  <label>
                    Confirm New Password
                    <input type="password" autoComplete="new-password" />
                  </label>
                </div>
                <button type="button" className="profile-primary-btn">Update Password</button>
              </article>
            </section>

            <section id="notifications" className="profile-section">
              <div className="profile-section-head">
                <h2>Notification Preferences</h2>
                <p>Customize how and when you want to be alerted about data events.</p>
              </div>
              <article className="profile-card">
                <div className="profile-notify-row"><span>New Lead Assigned</span><input type="checkbox" defaultChecked /></div>
                <div className="profile-notify-row"><span>Follow-up Reminder</span><input type="checkbox" defaultChecked /></div>
                <div className="profile-notify-row"><span>System Updates</span><input type="checkbox" defaultChecked /></div>
                <div className="profile-notify-row"><span>Deal Stage Change</span><input type="checkbox" defaultChecked /></div>
                <button type="button" className="profile-primary-btn">Save Preferences</button>
              </article>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
