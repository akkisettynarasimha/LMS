import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { FormEvent } from 'react'

type InvitationLink = {
  email: string
  link: string
  role: string
}

type InviteEmailResult = {
  email: string
  sent: boolean
  message?: string
  action?: string
}

type MailSetupHint = {
  configured: boolean
  message: string
}

export function InviteUserPage() {
  const [recipientName, setRecipientName] = useState('Nadia Khan')
  const [recipientEmails, setRecipientEmails] = useState('sales.rep@nexus.com')
  const [recipientPassword, setRecipientPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<'Super Admin' | 'Admin' | 'Manager' | 'Sales Executive' | 'Telecaller'>('Admin')
  const [welcomeNote, setWelcomeNote] = useState('Hey! Welcome to the Nexus CRM. Looking forward to having you on the team...')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [invitationLinks, setInvitationLinks] = useState<InvitationLink[]>([])
  const [inviteFailures, setInviteFailures] = useState<InviteEmailResult[]>([])
  const [mailSetupHint, setMailSetupHint] = useState('')
  const [copyMessage, setCopyMessage] = useState('')

  const recipients = useMemo(
    () => recipientEmails.split(/[\n,]+/).map((email) => email.trim()).filter(Boolean),
    [recipientEmails],
  )

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setStatusMessage('')
      setErrorMessage('')
      setCopyMessage('')
      setInvitationLinks([])
      setInviteFailures([])
      setMailSetupHint('')

      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: recipientName,
          emails: recipientEmails,
          role: selectedRole,
          password: recipientPassword,
          teams: ['North America Sales'],
          welcomeNote,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not send invitations')
      }

      setStatusMessage(data.message || 'Invitations processed successfully.')
      setInvitationLinks(Array.isArray(data.invitationLinks) ? data.invitationLinks : [])
      setInviteFailures(
        Array.isArray(data.emailResults)
          ? (data.emailResults as InviteEmailResult[]).filter((item) => item && item.sent === false)
          : [],
      )
      setMailSetupHint((data.mailSetup as MailSetupHint | undefined)?.message || '')
      setRecipientPassword('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send invitations'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyInviteLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopyMessage('Invitation link copied')
      setTimeout(() => setCopyMessage(''), 2000)
    } catch {
      setCopyMessage('Copy failed. Please copy manually.')
    }
  }

  return (
    <div className="invite-wrap">
      <section className="invite-head">
        <div className="invite-breadcrumb">
          <Link to="/users">Users</Link>
          <span className="material-symbols-outlined">chevron_right</span>
          <span>Invite New User</span>
        </div>
        <h2>Invite Team Members</h2>
        <p>Onboard your colleagues to collaborate on deals and manage customer relationships across the enterprise.</p>
      </section>

      <form className="invite-grid" id="invite-team-form" onSubmit={handleInviteSubmit}>
        <div className="invite-main">
          <article className="invite-card border-secondary">
            <div className="invite-card-head">
              <div>
                <h3>Add Recipients</h3>
                <p>Enter the recipient name and emails separated by commas or lines.</p>
              </div>
              <span className="material-symbols-outlined">alternate_email</span>
            </div>
            <div className="recipient-fields">
              <label className="recipient-field">
                <span>Recipient name</span>
                <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} type="text" placeholder="Nadia Khan" required />
              </label>
              <label className="recipient-field">
                <span>Recipient emails</span>
                <textarea value={recipientEmails} onChange={(event) => setRecipientEmails(event.target.value)} placeholder="sales.rep@nexus.com, manager@nexus.com..." required></textarea>
              </label>
              <label className="recipient-field">
                <span>Temporary password</span>
                <input
                  value={recipientPassword}
                  onChange={(event) => setRecipientPassword(event.target.value)}
                  type="password"
                  placeholder="Set the login password"
                  required
                />
              </label>
              <label className="recipient-field">
                <span>Role</span>
                <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as typeof selectedRole)}>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Sales Executive">Sales Executive</option>
                  <option value="Telecaller">Telecaller</option>
                </select>
              </label>
            </div>
          </article>

          <article className="invite-card">
            <h3>
              <span className="material-symbols-outlined">chat_bubble</span>
              Personalized Welcome Note
            </h3>
            <textarea value={welcomeNote} onChange={(event) => setWelcomeNote(event.target.value)} placeholder="Hey! Welcome to the Nexus CRM. Looking forward to having you on the team..."></textarea>
          </article>
        </div>

        <aside className="invite-side">
          <article className="invite-summary">
            <h4>Invitation Summary</h4>
            <div className="summary-row">
              <span>Recipients</span>
              <strong>{recipients.length} Pending</strong>
            </div>
            <div className="summary-row">
              <span>Role Type</span>
              <strong>{selectedRole}</strong>
            </div>
            {statusMessage ? <p className="summary-note success">{statusMessage}</p> : null}
            {errorMessage ? <p className="summary-note error">{errorMessage}</p> : null}
            {mailSetupHint ? <p className="summary-note warning">{mailSetupHint}</p> : null}
            {copyMessage ? <p className="summary-note success">{copyMessage}</p> : null}

            {inviteFailures.length > 0 ? (
              <div className="invite-links-box">
                <p className="invite-links-title">Email delivery issues</p>
                <ul>
                  {inviteFailures.map((item) => (
                    <li key={`fail-${item.email}`}>
                      <div>
                        <strong>{item.email}</strong>
                        <p>{item.message || 'Email delivery failed. Check SMTP settings.'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {invitationLinks.length > 0 ? (
              <div className="invite-links-box">
                <p className="invite-links-title">Share these login links</p>
                <ul>
                  {invitationLinks.map((item) => (
                    <li key={item.email}>
                      <div>
                        <strong>{item.email}</strong>
                        <a href={item.link} target="_blank" rel="noreferrer">{item.link}</a>
                      </div>
                      <button type="button" onClick={() => void copyInviteLink(item.link)}>Copy</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <button type="submit" className="send-btn" form="invite-team-form" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Invitations'}
              <span className="material-symbols-outlined">send</span>
            </button>
          </article>
        </aside>
      </form>
    </div>
  )
}
