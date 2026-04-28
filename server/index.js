import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import nodemailer from 'nodemailer'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

dotenv.config()

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const port = Number(process.env.PORT) || 5000
const mongoUri = process.env.MONGODB_URI || ''
const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || process.env.MAIL_HOST || ''
const smtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || process.env.MAIL_PORT) || 587
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USER || process.env.GMAIL_USER || ''
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.MAIL_PASS || process.env.GMAIL_APP_PASSWORD || ''
const smtpSecure = String(process.env.SMTP_SECURE || process.env.EMAIL_SECURE || process.env.MAIL_SECURE || 'false').toLowerCase() === 'true'
const smtpService = process.env.SMTP_SERVICE || process.env.EMAIL_SERVICE || process.env.MAIL_SERVICE || ''
const mailFrom = process.env.MAIL_FROM || process.env.EMAIL_FROM || smtpUser || 'no-reply@curator.local'
const appLoginUrl = process.env.APP_LOGIN_URL || 'http://localhost:5173/login'
const superAdminName = process.env.SUPER_ADMIN_NAME || 'Super Admin'
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@curator.local'
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123'

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true)
      }

      const allowedOrigins = [process.env.CLIENT_ORIGIN || 'http://localhost:5173', 'http://localhost:5174']
      const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)

      if (allowedOrigins.includes(origin) || isLocalhostOrigin) {
        return callback(null, true)
      }

      return callback(new Error('Not allowed by CORS'))
    },
  }),
)
app.use(express.json({ limit: '5mb' }))

const roleValues = ['Super Admin', 'Admin', 'Manager', 'Sales Executive', 'Telecaller']
const leadStatusValues = ['new', 'contacted', 'follow_up', 'qualified', 'proposal_sent', 'negotiation', 'done']

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: roleValues,
      required: true,
    },
    teams: {
      type: [String],
      default: [],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    welcomeNote: {
      type: String,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    leadType: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'warm',
    },
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'new',
    },
    assignedTo: {
      type: String,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

const invoiceStatusValues = ['paid', 'pending', 'overdue', 'approved', 'sent', 'in_collection', 'disputed']

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: invoiceStatusValues,
      required: true,
      default: 'pending',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerInitials: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  },
)

const settingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      unique: true,
      default: 'global',
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      default: 'Acme Global Industries',
    },
    website: {
      type: String,
      trim: true,
      default: 'https://acme-global.io',
    },
    industry: {
      type: String,
      trim: true,
      default: 'SaaS Enterprise',
    },
    headquartersAddress: {
      type: String,
      trim: true,
      default: 'One World Trade Center, NY',
    },
    primaryBrandColor: {
      type: String,
      trim: true,
      default: '#0059BB',
    },
    logoDataUrl: {
      type: String,
      trim: true,
      default: '',
    },
    faviconDataUrl: {
      type: String,
      trim: true,
      default: '',
    },
    billingPlan: {
      type: String,
      trim: true,
      default: 'Enterprise Plan',
    },
    billingSummary: {
      type: String,
      trim: true,
      default: 'Unlimited Curators • Priority Support',
    },
    nextPaymentDate: {
      type: String,
      trim: true,
      default: 'Oct 12, 2024',
    },
    security: {
      twoFARequired: {
        type: Boolean,
        default: true,
      },
      ssoEnabled: {
        type: Boolean,
        default: false,
      },
      ipWhitelisting: {
        type: Boolean,
        default: false,
      },
    },
    lastExportText: {
      type: String,
      trim: true,
      default: 'Last full export: 2 days ago',
    },
  },
  {
    timestamps: true,
  },
)

const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema)
const User = mongoose.models.User || mongoose.model('User', userSchema)
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema)
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema)

const defaultSettingsPayload = {
  singletonKey: 'global',
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

const sanitizeColorHex = (value) => {
  const candidate = String(value || '').trim().toUpperCase()
  if (/^#[0-9A-F]{6}$/.test(candidate)) {
    return candidate
  }

  return defaultSettingsPayload.primaryBrandColor
}

const normalizeSettingsInput = (payload) => ({
  companyName: String(payload?.companyName || defaultSettingsPayload.companyName).trim(),
  website: String(payload?.website || defaultSettingsPayload.website).trim(),
  industry: String(payload?.industry || defaultSettingsPayload.industry).trim(),
  headquartersAddress: String(payload?.headquartersAddress || defaultSettingsPayload.headquartersAddress).trim(),
  primaryBrandColor: sanitizeColorHex(payload?.primaryBrandColor),
  logoDataUrl: String(payload?.logoDataUrl || '').trim(),
  faviconDataUrl: String(payload?.faviconDataUrl || '').trim(),
  billingPlan: String(payload?.billingPlan || defaultSettingsPayload.billingPlan).trim(),
  billingSummary: String(payload?.billingSummary || defaultSettingsPayload.billingSummary).trim(),
  nextPaymentDate: String(payload?.nextPaymentDate || defaultSettingsPayload.nextPaymentDate).trim(),
  security: {
    twoFARequired: Boolean(payload?.security?.twoFARequired),
    ssoEnabled: Boolean(payload?.security?.ssoEnabled),
    ipWhitelisting: Boolean(payload?.security?.ipWhitelisting),
  },
  lastExportText: String(payload?.lastExportText || defaultSettingsPayload.lastExportText).trim(),
})

const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

const verifyPassword = (password, passwordHash) => {
  const [salt, derivedKey] = String(passwordHash).split(':')

  if (!salt || !derivedKey) {
    return false
  }

  const derivedBuffer = Buffer.from(derivedKey, 'hex')
  const checkBuffer = scryptSync(password, salt, derivedBuffer.length)

  if (derivedBuffer.length !== checkBuffer.length) {
    return false
  }

  return timingSafeEqual(derivedBuffer, checkBuffer)
}

const parseInviteEmails = (value) =>
  String(value || '')
    .split(/[\n,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

const normalizeRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase()

  if (normalized === 'admin') return 'Admin'
  if (normalized === 'super admin' || normalized === 'superadmin' || normalized === 'super-admin') return 'Super Admin'
  if (normalized === 'manager') return 'Manager'
  if (normalized === 'sales executive' || normalized === 'executive') return 'Sales Executive'
  if (normalized === 'telecaller') return 'Telecaller'

  return ''
}

const normalizeLeadStatus = (status) => {
  const rawStatus = String(status || '').trim().toLowerCase()
  if (!rawStatus) {
    return 'new'
  }

  const statusAliases = {
    'follow-up': 'follow_up',
    'follow up': 'follow_up',
  }

  const mappedStatus = statusAliases[rawStatus] || rawStatus
  const slugStatus = mappedStatus
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

  if (!slugStatus) {
    return 'new'
  }

  return slugStatus
}

const normalizeImportKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

const readSpreadsheetField = (row, aliases) => {
  if (!row || typeof row !== 'object') {
    return ''
  }

  const aliasSet = new Set(aliases.map(normalizeImportKey))
  const entries = Object.entries(row)
  const match = entries.find(([key]) => aliasSet.has(normalizeImportKey(key)))

  if (!match) {
    return ''
  }

  return String(match[1] ?? '').trim()
}

const readLeadField = (row, directKeys, aliases) => {
  if (!row || typeof row !== 'object') {
    return ''
  }

  for (const key of directKeys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim()
    }
  }

  return readSpreadsheetField(row, aliases)
}

const normalizeSpreadsheetLead = (row) => {
  const name = readLeadField(row, ['name', 'fullName'], ['name', 'full name', 'full_name', 'lead name'])
  const email = readLeadField(row, ['email', 'emailAddress'], ['email', 'email address', 'e-mail', 'mail']).toLowerCase()
  const phone = readLeadField(row, ['phone', 'phoneNumber'], ['phone', 'phone number', 'mobile', 'contact number'])
  const companyName = readLeadField(row, ['companyName'], ['company', 'company name', 'organization'])
  const source = readLeadField(row, ['source'], ['source', 'lead source', 'channel']).toLowerCase() || 'manual'
  const leadTypeRaw = readLeadField(row, ['leadType'], ['lead type', 'type', 'lead_type']).toLowerCase()
  const leadType = ['hot', 'warm', 'cold'].includes(leadTypeRaw) ? leadTypeRaw : 'warm'
  const budgetRaw = readLeadField(row, ['budget'], ['budget', 'budget ($)', 'budget_usd'])
  const notes = readLeadField(row, ['notes'], ['notes', 'requirement notes', 'requirements', 'description'])
  const status = normalizeLeadStatus(readLeadField(row, ['status'], ['status', 'stage', 'lead status']))
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
}

const createMailTransport = () => {
  if (!smtpUser || !smtpPass) {
    return null
  }

  // Auto-pick a commonly used SMTP setup when host is not explicitly provided.
  if (!smtpHost && !smtpService && smtpUser.endsWith('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  }

  if (!smtpHost && smtpService) {
    return nodemailer.createTransport({
      service: smtpService,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  }

  if (!smtpHost) {
    return null
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })
}

const mailTransport = createMailTransport()

const verifyMailTransport = async () => {
  if (!mailTransport) {
    console.warn(
      '[mail] SMTP transport not configured. Set SMTP_USER, SMTP_PASS, and SMTP_HOST or SMTP_SERVICE (Gmail can use SMTP_USER + SMTP_PASS).',
    )
    return
  }

  try {
    await mailTransport.verify()
    console.info('[mail] SMTP transport verified successfully.')
  } catch (error) {
    const hint = formatMailError(error)
    console.error(`[mail] SMTP transport verification failed: ${hint}`)
  }
}

const getMailSetupHint = () => {
  if (mailTransport) {
    return null
  }

  return {
    configured: false,
    message:
      'SMTP is not configured. Set SMTP_USER and SMTP_PASS (or EMAIL_USER/EMAIL_PASS), and either SMTP_HOST or SMTP_SERVICE. For Gmail, SMTP_USER/SMTP_PASS is enough.',
  }
}

const sendInviteEmail = async ({ name, email, role, password, welcomeNote }) => {
  if (!mailTransport) {
    return { sent: false, message: 'SMTP is not configured' }
  }

  await mailTransport.sendMail({
    from: mailFrom,
    to: email,
    subject: `You have been invited to Curator CRM as ${role}`,
    text: [
      `Hello ${name},`,
      '',
      `You have been invited to Curator CRM as ${role}.`,
      `Login email: ${email}`,
      `Temporary password: ${password}`,
      `Login here: ${appLoginUrl}`,
      '',
      welcomeNote ? `Message from your admin: ${welcomeNote}` : '',
      'Please change your password after your first login.',
    ]
      .filter(Boolean)
      .join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #191c1d; line-height: 1.5;">
        <h2 style="margin: 0 0 12px; color: #0b193c;">Welcome to Curator CRM</h2>
        <p style="margin: 0 0 12px;">Hello ${name},</p>
        <p style="margin: 0 0 12px;">You have been invited as <strong>${role}</strong>.</p>
        <p style="margin: 0 0 12px;">Login email: <strong>${email}</strong></p>
        <p style="margin: 0 0 12px;">Temporary password: <strong>${password}</strong></p>
        <p style="margin: 0 0 16px;">Login here: <a href="${appLoginUrl}">${appLoginUrl}</a></p>
        ${welcomeNote ? `<p style="margin: 0 0 12px;"><strong>Message from your admin:</strong> ${welcomeNote}</p>` : ''}
        <p style="margin: 0;">Please change your password after your first login.</p>
      </div>
    `,
  })

  return { sent: true, message: 'Invitation email sent' }
}

const formatMailError = (error) => {
  const message = error instanceof Error ? error.message : 'Email delivery failed'

  if (message.includes('Invalid login') || message.includes('BadCredentials') || String(error?.code || '') === 'EAUTH') {
    return 'SMTP authentication failed. For Gmail, use a Google App Password instead of your normal account password.'
  }

  return message
}

void verifyMailTransport()

const ensureSuperAdminUser = async () => {
  if (!superAdminEmail || !superAdminPassword) {
    return null
  }

  const normalizedEmail = String(superAdminEmail).trim().toLowerCase()
  const passwordHash = hashPassword(superAdminPassword)

  await User.collection.updateOne(
    { email: normalizedEmail },
    {
      $set: {
        name: superAdminName,
        email: normalizedEmail,
        role: 'Super Admin',
        teams: ['Executive'],
        passwordHash,
        welcomeNote: 'Provisioned for platform administration.',
        active: true,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        invitedAt: new Date(),
        createdAt: new Date(),
      },
    },
    { upsert: true },
  )

  return User.findOne({ email: normalizedEmail })
}

const formatCurrencyUSD = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)

const toCompactCurrency = (amount) => {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`
  }

  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`
  }

  return `$${amount.toFixed(0)}`
}

const mapStatusToBadge = (status) => {
  if (status === 'paid') return { label: 'Paid', tone: 'tone-negotiation' }
  if (status === 'overdue') return { label: 'Overdue', tone: 'tone-overdue' }
  if (status === 'pending') return { label: 'Pending', tone: 'tone-proposal' }
  if (status === 'approved') return { label: 'Approved', tone: 'tone-discovery' }
  if (status === 'sent') return { label: 'Sent', tone: 'tone-discovery' }
  if (status === 'in_collection') return { label: 'In Collection', tone: 'tone-proposal' }
  return { label: 'Disputed', tone: 'tone-overdue' }
}

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''))

const sanitizeUserForResponse = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  teams: Array.isArray(user.teams) ? user.teams : [],
  active: Boolean(user.active),
  invitedAt: user.invitedAt,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

const computeLeadModuleSummary = (leads) => {
  const total = leads.length
  const counts = leadStatusValues.reduce((acc, status) => {
    acc[status] = 0
    return acc
  }, {})
  const sourceMap = new Map()

  for (const lead of leads) {
    const normalizedStatus = normalizeLeadStatus(lead.status)
    counts[normalizedStatus] = (counts[normalizedStatus] || 0) + 1
    const sourceKey = String(lead.source || 'manual').trim().toLowerCase() || 'manual'
    sourceMap.set(sourceKey, (sourceMap.get(sourceKey) || 0) + 1)
  }

  const conversionRate = total > 0 ? Number(((counts.qualified / total) * 100).toFixed(1)) : 0

  return {
    metrics: {
      total,
      newLeads: counts.new,
      contacted: counts.contacted,
      followUps: counts.follow_up,
      converted: counts.qualified,
      proposalSent: counts.proposal_sent,
      negotiation: counts.negotiation,
      done: counts.done || 0,
      conversionRate,
    },
    sourceBreakdown: Array.from(sourceMap.entries())
      .map(([source, count]) => ({
        source,
        count,
        percent: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count),
    stageBreakdown: Object.keys(counts).map((status) => ({
      status,
      count: counts[status],
      percent: total > 0 ? Number(((counts[status] / total) * 100).toFixed(1)) : 0,
    })),
  }
}

const withDbGuard = (response) => {
  if (!isDbReady()) {
    response.status(503).json({ message: 'Database is not connected' })
    return false
  }

  return true
}

const generateBillingSummary = (invoices) => {
  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
  const paidAmount = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.amount, 0)
  const outstandingAmount = invoices
    .filter((invoice) => ['pending', 'overdue', 'in_collection', 'sent', 'approved', 'disputed'].includes(invoice.status))
    .reduce((sum, invoice) => sum + invoice.amount, 0)
  const collectionRate = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

  const pipeline = {
    billed: totalAmount,
    approved: invoices.filter((invoice) => invoice.status === 'approved').reduce((sum, invoice) => sum + invoice.amount, 0),
    sent: invoices.filter((invoice) => invoice.status === 'sent').reduce((sum, invoice) => sum + invoice.amount, 0),
    inCollection: invoices.filter((invoice) => invoice.status === 'in_collection').reduce((sum, invoice) => sum + invoice.amount, 0),
    disputed: invoices.filter((invoice) => invoice.status === 'disputed').reduce((sum, invoice) => sum + invoice.amount, 0),
  }

  const metrics = [
    { label: 'Monthly Recurring Revenue', value: formatCurrencyUSD(totalAmount), delta: '+6.4%', tone: 'up' },
    { label: 'Collection Rate', value: `${collectionRate.toFixed(1)}%`, delta: '+1.3%', tone: 'up' },
    { label: 'Outstanding Invoices', value: toCompactCurrency(outstandingAmount), delta: '-2.2%', tone: 'down' },
    { label: 'Active Subscriptions', value: String(new Set(invoices.map((invoice) => invoice.accountName)).size), delta: '+4.8%', tone: 'up' },
  ]

  const ownerMap = new Map()
  for (const invoice of invoices) {
    const current = ownerMap.get(invoice.ownerName) || {
      ownerName: invoice.ownerName,
      ownerInitials: invoice.ownerInitials,
      total: 0,
    }

    current.total += invoice.amount
    ownerMap.set(invoice.ownerName, current)
  }

  const topCollectors = Array.from(ownerMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((entry, index) => ({
      name: entry.ownerName,
      initials: entry.ownerInitials,
      role: ['Enterprise AE', 'Mid-Market AE', 'Strategic AE'][index] || 'Account Executive',
      target: `${Math.max(102, Math.round((entry.total / Math.max(totalAmount, 1)) * 180))}%`,
    }))

  const recentInvoices = invoices
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8)
    .map((invoice) => {
      const badge = mapStatusToBadge(invoice.status)
      return {
        invoice: invoice.invoiceNumber,
        account: invoice.accountName,
        status: badge.label,
        statusTone: badge.tone,
        amount: formatCurrencyUSD(invoice.amount),
        dueDate: new Date(invoice.dueDate).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }),
        owner: invoice.ownerName,
        ownerInitials: invoice.ownerInitials,
      }
    })

  return {
    metrics,
    pipeline,
    forecast: [58, 72, 84, 46, 68, 91],
    topCollectors,
    recentInvoices,
    insight:
      'Invoices in Pending status are clearing 14% faster this cycle. Follow up on overdue accounts to improve month-end collections.',
  }
}

const ensureBillingSeedData = async () => {
  const count = await Invoice.countDocuments()

  if (count > 0) {
    return
  }

  const now = new Date()
  const sampleInvoices = [
    { invoiceNumber: 'INV-2023-1192', accountName: 'Logistics Pro Co.', status: 'pending', amount: 240000, dueDate: new Date('2023-10-24'), ownerName: 'Marcus Chen', ownerInitials: 'MC', createdAt: now, updatedAt: now },
    { invoiceNumber: 'INV-2023-1218', accountName: 'CloudScale Inc.', status: 'paid', amount: 125500, dueDate: new Date('2023-11-12'), ownerName: 'Sarah Jenkins', ownerInitials: 'SJ', createdAt: now, updatedAt: now },
    { invoiceNumber: 'INV-2023-1247', accountName: 'Metro Bank', status: 'overdue', amount: 48000, dueDate: new Date('2023-12-05'), ownerName: 'David Rossi', ownerInitials: 'DR', createdAt: now, updatedAt: now },
    { invoiceNumber: 'INV-2023-1259', accountName: 'Vertex Mobility', status: 'approved', amount: 92000, dueDate: new Date('2024-01-11'), ownerName: 'Marcus Chen', ownerInitials: 'MC', createdAt: now, updatedAt: now },
    { invoiceNumber: 'INV-2023-1292', accountName: 'Summit FinOps', status: 'sent', amount: 76000, dueDate: new Date('2024-01-18'), ownerName: 'Sarah Jenkins', ownerInitials: 'SJ', createdAt: now, updatedAt: now },
    { invoiceNumber: 'INV-2023-1310', accountName: 'Northstar Health', status: 'in_collection', amount: 63500, dueDate: new Date('2024-02-03'), ownerName: 'David Rossi', ownerInitials: 'DR', createdAt: now, updatedAt: now },
    { invoiceNumber: 'INV-2023-1331', accountName: 'CloudScale Inc.', status: 'paid', amount: 154000, dueDate: new Date('2024-02-19'), ownerName: 'Sarah Jenkins', ownerInitials: 'SJ', createdAt: now, updatedAt: now },
    { invoiceNumber: 'INV-2023-1348', accountName: 'Global Logistics Hub', status: 'disputed', amount: 31000, dueDate: new Date('2024-03-02'), ownerName: 'Marcus Chen', ownerInitials: 'MC', createdAt: now, updatedAt: now },
  ]

  await Invoice.insertMany(sampleInvoices)
}

const isDbReady = () => mongoose.connection.readyState === 1

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    database: isDbReady() ? 'connected' : 'disconnected',
    mail: mailTransport ? 'configured' : 'not-configured',
  })
})

app.get('/api/leads', async (_request, response) => {
  if (!withDbGuard(response)) return

  const { search = '', status = '', source = '', page = '1', limit = '100' } = _request.query
  const hasFilterQuery =
    String(search).trim().length > 0 ||
    String(status).trim().length > 0 ||
    String(source).trim().length > 0 ||
    String(page) !== '1' ||
    String(limit) !== '100'
  const query = {}

  const normalizedStatus = normalizeLeadStatus(status)
  if (String(status || '').trim() && normalizedStatus) {
    query.status = normalizedStatus
  }

  if (String(source).trim()) {
    query.source = String(source).trim().toLowerCase()
  }

  if (String(search).trim()) {
    const needle = String(search).trim()
    query.$or = [
      { name: { $regex: needle, $options: 'i' } },
      { email: { $regex: needle, $options: 'i' } },
    ]
  }

  const pageNum = Math.max(1, Number.parseInt(String(page), 10) || 1)
  const limitNum = Math.min(200, Math.max(1, Number.parseInt(String(limit), 10) || 100))
  const skip = (pageNum - 1) * limitNum

  const [items, total] = await Promise.all([
    Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Lead.countDocuments(query),
  ])

  if (!hasFilterQuery) {
    return response.json(items)
  }

  return response.json({
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    },
  })
})

app.get('/api/leads/:id', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params
  if (!isValidObjectId(id)) {
    return response.status(400).json({ message: 'Invalid lead id' })
  }

  const lead = await Lead.findById(id).lean()
  if (!lead) {
    return response.status(404).json({ message: 'Lead not found' })
  }

  return response.json(lead)
})

app.get('/api/billing/summary', async (_request, response) => {
  if (!isDbReady()) {
    return response.status(503).json({ message: 'Database is not connected' })
  }

  const invoices = await Invoice.find().lean()
  const summary = generateBillingSummary(invoices)
  return response.json(summary)
})

app.get('/api/billing/invoices', async (_request, response) => {
  if (!withDbGuard(response)) return

  const invoices = await Invoice.find().sort({ updatedAt: -1 }).lean()
  return response.json(invoices)
})

app.post('/api/billing/invoices', async (request, response) => {
  if (!withDbGuard(response)) return

  const {
    invoiceNumber,
    accountName,
    status = 'pending',
    amount,
    dueDate,
    ownerName,
    ownerInitials,
  } = request.body || {}

  if (!invoiceNumber || !accountName || !amount || !dueDate || !ownerName || !ownerInitials) {
    return response.status(400).json({ message: 'invoiceNumber, accountName, amount, dueDate, ownerName, ownerInitials are required' })
  }

  if (!invoiceStatusValues.includes(String(status))) {
    return response.status(400).json({ message: 'Invalid invoice status' })
  }

  const created = await Invoice.create({
    invoiceNumber: String(invoiceNumber).trim(),
    accountName: String(accountName).trim(),
    status: String(status),
    amount: Number(amount),
    dueDate: new Date(dueDate),
    ownerName: String(ownerName).trim(),
    ownerInitials: String(ownerInitials).trim().toUpperCase(),
  })

  return response.status(201).json(created)
})

app.patch('/api/billing/invoices/:id', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params
  if (!isValidObjectId(id)) {
    return response.status(400).json({ message: 'Invalid invoice id' })
  }

  const updates = {}
  const allowedFields = ['accountName', 'status', 'amount', 'dueDate', 'ownerName', 'ownerInitials']

  for (const field of allowedFields) {
    if (request.body?.[field] !== undefined) {
      updates[field] = request.body[field]
    }
  }

  if (updates.status && !invoiceStatusValues.includes(String(updates.status))) {
    return response.status(400).json({ message: 'Invalid invoice status' })
  }

  if (updates.amount !== undefined) {
    updates.amount = Number(updates.amount)
  }

  if (updates.dueDate !== undefined) {
    updates.dueDate = new Date(updates.dueDate)
  }

  if (updates.ownerInitials !== undefined) {
    updates.ownerInitials = String(updates.ownerInitials).trim().toUpperCase()
  }

  const updated = await Invoice.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean()
  if (!updated) {
    return response.status(404).json({ message: 'Invoice not found' })
  }

  return response.json(updated)
})

app.delete('/api/billing/invoices/:id', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params
  if (!isValidObjectId(id)) {
    return response.status(400).json({ message: 'Invalid invoice id' })
  }

  const deleted = await Invoice.findByIdAndDelete(id).lean()
  if (!deleted) {
    return response.status(404).json({ message: 'Invoice not found' })
  }

  return response.json({ message: 'Invoice deleted successfully' })
})

app.get('/api/settings', async (_request, response) => {
  if (!isDbReady()) {
    return response.status(503).json({ message: 'Database is not connected' })
  }

  const settings = await Settings.findOneAndUpdate(
    { singletonKey: 'global' },
    { $setOnInsert: defaultSettingsPayload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()

  return response.json(settings || defaultSettingsPayload)
})

app.put('/api/settings', async (request, response) => {
  if (!isDbReady()) {
    return response.status(503).json({ message: 'Database is not connected' })
  }

  const normalizedPayload = normalizeSettingsInput(request.body)

  if (!normalizedPayload.companyName) {
    return response.status(400).json({ message: 'Company name is required' })
  }

  const updatedSettings = await Settings.findOneAndUpdate(
    { singletonKey: 'global' },
    {
      $set: {
        ...normalizedPayload,
      },
      $setOnInsert: {
        singletonKey: 'global',
        createdAt: new Date(),
      },
      $currentDate: {
        updatedAt: true,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean()

  return response.json({
    message: 'Settings updated successfully',
    settings:
      updatedSettings || {
        ...defaultSettingsPayload,
        ...normalizedPayload,
        singletonKey: 'global',
      },
  })
})

app.post('/api/leads', async (request, response) => {
  if (!withDbGuard(response)) return

  const { name, email, source, phone, companyName, leadType, budget, notes, status, assignedTo } = request.body

  if (!name || !email) {
    return response.status(400).json({ message: 'Name and email are required' })
  }

  const normalizedStatus = normalizeLeadStatus(status)

  const lead = await Lead.create({
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    source: String(source || '').trim().toLowerCase(),
    phone: String(phone || '').trim(),
    companyName: String(companyName || '').trim(),
    leadType: String(leadType || 'warm').trim().toLowerCase(),
    budget: Math.max(0, Number(budget) || 0),
    notes: String(notes || '').trim(),
    status: normalizedStatus,
    assignedTo: assignedTo ? String(assignedTo).trim() : null,
  })
  return response.status(201).json(lead)
})

app.patch('/api/leads/:id', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params
  if (!isValidObjectId(id)) {
    return response.status(400).json({ message: 'Invalid lead id' })
  }

  const updates = {}
  const allowedFields = ['name', 'email', 'source', 'phone', 'companyName', 'leadType', 'budget', 'notes', 'status', 'assignedTo']

  for (const field of allowedFields) {
    if (request.body?.[field] !== undefined) {
      updates[field] = request.body[field]
    }
  }

  if (updates.status !== undefined) {
    updates.status = normalizeLeadStatus(updates.status)
  }

  if (updates.email !== undefined) {
    updates.email = String(updates.email).trim().toLowerCase()
  }

  if (updates.name !== undefined) {
    updates.name = String(updates.name).trim()
  }

  if (updates.source !== undefined) {
    updates.source = String(updates.source).trim().toLowerCase()
  }

  if (updates.phone !== undefined) {
    updates.phone = String(updates.phone).trim()
  }

  if (updates.companyName !== undefined) {
    updates.companyName = String(updates.companyName).trim()
  }

  if (updates.leadType !== undefined) {
    updates.leadType = String(updates.leadType).trim().toLowerCase()
  }

  if (updates.budget !== undefined) {
    updates.budget = Math.max(0, Number(updates.budget) || 0)
  }

  if (updates.notes !== undefined) {
    updates.notes = String(updates.notes).trim()
  }

  if (updates.assignedTo !== undefined) {
    updates.assignedTo = updates.assignedTo ? String(updates.assignedTo).trim() : null
  }

  const updated = await Lead.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean()
  if (!updated) {
    return response.status(404).json({ message: 'Lead not found' })
  }

  return response.json(updated)
})

app.delete('/api/leads/:id', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params
  if (!isValidObjectId(id)) {
    return response.status(400).json({ message: 'Invalid lead id' })
  }

  const deleted = await Lead.findByIdAndDelete(id).lean()
  if (!deleted) {
    return response.status(404).json({ message: 'Lead not found' })
  }

  return response.json({ message: 'Lead deleted successfully' })
})

app.get('/api/dashboard/summary', async (_request, response) => {
  if (!withDbGuard(response)) return

  const leads = await Lead.find().sort({ createdAt: -1 }).lean()
  const summary = computeLeadModuleSummary(leads)

  return response.json({
    ...summary,
    recentLeads: leads.slice(0, 5),
  })
})

app.get('/api/reports/summary', async (_request, response) => {
  if (!withDbGuard(response)) return

  const leads = await Lead.find().sort({ createdAt: -1 }).lean()
  const summary = computeLeadModuleSummary(leads)

  const teamPerformance = [
    { name: 'Alex Thompson', role: 'Senior Specialist', totalLeads: 342, conversion: '14.2%', delta: '+2%', response: '12 mins', revenue: 42500, status: 'On Target' },
    { name: 'Sarah Jenkins', role: 'Account Manager', totalLeads: 298, conversion: '12.8%', delta: '-1%', response: '15 mins', revenue: 38200, status: 'Watchlist' },
    { name: 'Daniel Ortiz', role: 'Sales Executive', totalLeads: 188, conversion: '10.4%', delta: '+4%', response: '9 mins', revenue: 21000, status: 'Top Performer' },
  ]

  return response.json({
    metrics: summary.metrics,
    sourceBreakdown: summary.sourceBreakdown,
    stageBreakdown: summary.stageBreakdown,
    teamPerformance,
  })
})

app.get('/api/sales/summary', async (_request, response) => {
  if (!withDbGuard(response)) return

  const leads = await Lead.find().sort({ createdAt: -1 }).lean()
  const summary = computeLeadModuleSummary(leads)

  return response.json({
    metrics: summary.metrics,
    funnel: summary.stageBreakdown,
    sourceBreakdown: summary.sourceBreakdown,
    winRate: summary.metrics.conversionRate,
    totalOpportunities: summary.metrics.total,
  })
})

app.get('/api/users', async (request, response) => {
  if (!withDbGuard(response)) return

  const { search = '', role = '', active = '' } = request.query
  const query = {}

  if (String(role).trim()) {
    query.role = String(role).trim()
  }

  if (String(active).trim()) {
    query.active = String(active).trim().toLowerCase() === 'true'
  }

  if (String(search).trim()) {
    const needle = String(search).trim()
    query.$or = [
      { name: { $regex: needle, $options: 'i' } },
      { email: { $regex: needle, $options: 'i' } },
    ]
  }

  const users = await User.find(query).sort({ createdAt: -1 }).lean()
  return response.json(users.map(sanitizeUserForResponse))
})

app.get('/api/users/:id', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params

  const user = isValidObjectId(id)
    ? await User.findById(id).lean()
    : await User.findOne({ email: String(id).trim().toLowerCase() }).lean()

  if (!user) {
    return response.status(404).json({ message: 'User not found' })
  }

  return response.json(sanitizeUserForResponse(user))
})

app.patch('/api/users/:id', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params
  if (!isValidObjectId(id)) {
    return response.status(400).json({ message: 'Invalid user id' })
  }

  const updates = {}
  const allowedFields = ['name', 'role', 'teams', 'active', 'welcomeNote']
  for (const field of allowedFields) {
    if (request.body?.[field] !== undefined) {
      updates[field] = request.body[field]
    }
  }

  if (updates.role && !roleValues.includes(String(updates.role))) {
    return response.status(400).json({ message: 'Invalid role value' })
  }

  if (updates.teams !== undefined && !Array.isArray(updates.teams)) {
    return response.status(400).json({ message: 'teams must be an array' })
  }

  const updated = await User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean()
  if (!updated) {
    return response.status(404).json({ message: 'User not found' })
  }

  return response.json(sanitizeUserForResponse(updated))
})

app.patch('/api/users/:id/status', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params
  const { active } = request.body || {}

  if (!isValidObjectId(id)) {
    return response.status(400).json({ message: 'Invalid user id' })
  }

  if (typeof active !== 'boolean') {
    return response.status(400).json({ message: 'active boolean is required' })
  }

  const updated = await User.findByIdAndUpdate(id, { $set: { active } }, { new: true, runValidators: true }).lean()
  if (!updated) {
    return response.status(404).json({ message: 'User not found' })
  }

  return response.json(sanitizeUserForResponse(updated))
})

app.delete('/api/users/:id', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params
  if (!isValidObjectId(id)) {
    return response.status(400).json({ message: 'Invalid user id' })
  }

  const deleted = await User.findByIdAndDelete(id).lean()
  if (!deleted) {
    return response.status(404).json({ message: 'User not found' })
  }

  return response.json({ message: 'User deleted successfully' })
})

app.get('/api/profile/:id', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params
  const user = isValidObjectId(id)
    ? await User.findById(id).lean()
    : await User.findOne({ email: String(id).trim().toLowerCase() }).lean()

  if (!user) {
    return response.status(404).json({ message: 'Profile not found' })
  }

  return response.json(sanitizeUserForResponse(user))
})

app.put('/api/profile/:id', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params

  const profileUpdates = {
    name: request.body?.name,
    teams: request.body?.teams,
    welcomeNote: request.body?.welcomeNote,
  }

  if (profileUpdates.teams !== undefined && !Array.isArray(profileUpdates.teams)) {
    return response.status(400).json({ message: 'teams must be an array' })
  }

  let updated
  if (isValidObjectId(id)) {
    updated = await User.findByIdAndUpdate(id, { $set: profileUpdates }, { new: true, runValidators: true }).lean()
  } else {
    updated = await User.findOneAndUpdate(
      { email: String(id).trim().toLowerCase() },
      { $set: profileUpdates },
      { new: true, runValidators: true },
    ).lean()
  }

  if (!updated) {
    return response.status(404).json({ message: 'Profile not found' })
  }

  return response.json({ message: 'Profile updated successfully', profile: sanitizeUserForResponse(updated) })
})

app.post('/api/users/invite', async (request, response) => {
  if (!isDbReady()) {
    return response.status(503).json({ message: 'Database is not connected' })
  }

  const { name, email, emails, role, password, teams = [], welcomeNote = '' } = request.body
  const inviteEmails = parseInviteEmails(emails || email)
  const inviteRole = normalizeRole(role)

  if (!name || inviteEmails.length === 0 || !password || !inviteRole) {
    return response.status(400).json({
      message: 'Name, at least one email, role, and password are required',
    })
  }

  const createdUsers = []
  const reinvitedUsers = []
  const failedUsers = []
  const emailResults = []
  const invitationLinks = []

  for (const inviteEmail of inviteEmails) {
    const inviteLink = `${appLoginUrl}?email=${encodeURIComponent(inviteEmail)}`
    invitationLinks.push({
      email: inviteEmail,
      link: inviteLink,
      role: inviteRole,
    })

    const existingUser = await User.findOne({ email: inviteEmail })

    if (existingUser) {
      existingUser.name = name
      existingUser.role = inviteRole
      existingUser.teams = Array.isArray(teams) ? teams : []
      existingUser.passwordHash = hashPassword(password)
      existingUser.welcomeNote = welcomeNote
      existingUser.active = true
      existingUser.invitedAt = new Date()
      await existingUser.save()

      reinvitedUsers.push(existingUser)

      try {
        const mailResult = await sendInviteEmail({
          name,
          email: inviteEmail,
          role: inviteRole,
          password,
          welcomeNote,
        })

        emailResults.push({ email: inviteEmail, ...mailResult, action: 'reinvited' })
      } catch (error) {
        console.error('Failed to send invite email:', error)
        failedUsers.push(inviteEmail)
        emailResults.push({ email: inviteEmail, sent: false, message: formatMailError(error), action: 'reinvited' })
      }

      continue
    }

    const passwordHash = hashPassword(password)
    const createdUser = await User.create({
      name,
      email: inviteEmail,
      role: inviteRole,
      teams: Array.isArray(teams) ? teams : [],
      passwordHash,
      welcomeNote,
      active: true,
      invitedAt: new Date(),
    })

    createdUsers.push(createdUser)

    try {
      const mailResult = await sendInviteEmail({
        name,
        email: inviteEmail,
        role: inviteRole,
        password,
        welcomeNote,
      })

      emailResults.push({ email: inviteEmail, ...mailResult })
    } catch (error) {
      console.error('Failed to send invite email:', error)
      failedUsers.push(inviteEmail)
      emailResults.push({ email: inviteEmail, sent: false, message: formatMailError(error), action: 'created' })
    }
  }

  const responseSummary = [
    `Created ${createdUsers.length} user(s)`,
    `Re-invited ${reinvitedUsers.length} existing user(s)`,
    failedUsers.length ? `Email failed for ${failedUsers.length} user(s)` : '',
  ]
    .filter(Boolean)
    .join(', ')

  return response.status(201).json({
    message: responseSummary,
    created: createdUsers.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    })),
    reinvited: reinvitedUsers.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    })),
    failedUsers,
    emailResults,
    invitationLinks,
    temporaryPassword: String(password),
    loginUrl: appLoginUrl,
    mailSetup: getMailSetupHint(),
  })
})

app.post('/api/auth/login', async (request, response) => {
  if (!isDbReady()) {
    return response.status(503).json({ message: 'Database is not connected' })
  }

  const { email, password } = request.body
  const normalizedEmail = String(email || '').trim().toLowerCase()

  if (!email || !password) {
    return response.status(400).json({ message: 'Email and password are required' })
  }

  if (normalizedEmail === superAdminEmail && String(password) === superAdminPassword) {
    await User.collection.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          name: superAdminName,
          email: normalizedEmail,
          role: 'Super Admin',
          teams: ['Executive'],
          active: true,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          passwordHash: hashPassword(superAdminPassword),
          invitedAt: new Date(),
          createdAt: new Date(),
        },
      },
      { upsert: true },
    )

    return response.json({
      message: 'Login successful',
      user: {
        id: normalizedEmail,
        name: superAdminName,
        email: normalizedEmail,
        role: 'Super Admin',
        teams: ['Executive'],
      },
    })
  }

  const user = await User.findOne({ email: normalizedEmail })

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return response.status(401).json({ message: 'Invalid email or password' })
  }

  if (!user.active) {
    return response.status(403).json({ message: 'This account is disabled' })
  }

  await User.collection.updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date() } },
  )

  return response.json({
    message: 'Login successful',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      teams: user.teams,
    },
  })
})

app.post('/api/leads/bulk/upload', async (request, response) => {
  if (!withDbGuard(response)) return

  const { leads } = request.body

  if (!Array.isArray(leads) || leads.length === 0) {
    return response.status(400).json({ message: 'Leads array is required and must not be empty' })
  }

  const parsedLeads = leads.map(normalizeSpreadsheetLead)
  const validLeads = parsedLeads
    .filter((lead) => lead.isValid)
    .map(({ isValid, ...lead }) => lead)

  if (validLeads.length === 0) {
    return response.status(400).json({ message: 'No valid leads found. Ensure all leads have name and email.' })
  }

  const seenEmails = new Set()
  const uniqueLeads = validLeads.filter((lead) => {
    if (seenEmails.has(lead.email)) {
      return false
    }
    seenEmails.add(lead.email)
    return true
  })

  const existingLeads = await Lead.find(
    { email: { $in: uniqueLeads.map((lead) => lead.email) } },
    { email: 1, _id: 0 },
  ).lean()
  const existingEmailSet = new Set(existingLeads.map((lead) => String(lead.email || '').toLowerCase()))

  const leadsToCreate = uniqueLeads.filter((lead) => !existingEmailSet.has(lead.email))

  if (leadsToCreate.length === 0) {
    return response.status(200).json({
      message: 'No new leads to import. All valid rows already exist.',
      leads: [],
      total: 0,
      received: leads.length,
      valid: validLeads.length,
      skipped: leads.length,
    })
  }

  const created = await Lead.insertMany(leadsToCreate, { ordered: false })
  const skipped = leads.length - created.length
  return response.status(201).json({
    message: `Successfully created ${created.length} leads`,
    leads: created,
    total: created.length,
    received: leads.length,
    valid: validLeads.length,
    skipped,
  })
})

app.patch('/api/leads/:id/status', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params
  const status = normalizeLeadStatus(request.body?.status)

  if (!isValidObjectId(id)) {
    return response.status(400).json({ message: 'Invalid lead id' })
  }

  const updatedLead = await Lead.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true },
  ).lean()

  if (!updatedLead) {
    return response.status(404).json({ message: 'Lead not found' })
  }

  return response.json(updatedLead)
})

app.patch('/api/leads/:id/assign', async (request, response) => {
  if (!withDbGuard(response)) return

  const { id } = request.params
  const { assignedTo } = request.body

  if (!isValidObjectId(id)) {
    return response.status(400).json({ message: 'Invalid lead id' })
  }

  if (assignedTo && !isValidObjectId(assignedTo)) {
    return response.status(400).json({ message: 'Invalid user id' })
  }

  const updatedLead = await Lead.findByIdAndUpdate(
    id,
    { assignedTo: assignedTo || null },
    { new: true, runValidators: true },
  ).lean()

  if (!updatedLead) {
    return response.status(404).json({ message: 'Lead not found' })
  }

  return response.json(updatedLead)
})

app.use((error, _request, response, next) => {
  if (!error) {
    next()
    return
  }

  if (error.type === 'entity.too.large') {
    return response.status(413).json({
      message: 'Request payload is too large. Reduce uploaded asset size and try again.',
    })
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return response.status(400).json({ message: 'Invalid JSON payload' })
  }

  console.error('Unhandled API error:', error)
  return response.status(500).json({ message: 'Internal server error' })
})

// Serve front-end build (Vite `dist`) for production hosts like Render
const isProduction = process.env.NODE_ENV === 'production' || !__filename.includes('src')
const distPath = isProduction 
  ? path.join(__dirname, 'dist') 
  : path.join(__dirname, '../dist')

app.use(express.static(distPath))

app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const startServer = async () => {
  if (!mongoUri) {
    console.warn('MONGODB_URI is missing. API runs, but lead endpoints will return 503.')
  } else {
    try {
      await mongoose.connect(mongoUri)
      console.log('MongoDB connected')
      await ensureSuperAdminUser()
      await ensureBillingSeedData()
    } catch (error) {
      console.error('MongoDB connection failed:', error)
    }
  }

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)

    if (!mailTransport) {
      console.warn('SMTP is not configured. Invitation emails will not be delivered.')
      console.warn('Set SMTP_USER, SMTP_PASS, and either SMTP_HOST or SMTP_SERVICE in your .env file.')
    } else {
      console.log('SMTP transport configured for invitation emails')
    }
  })
}

startServer()
