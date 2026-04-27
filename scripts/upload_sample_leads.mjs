import fs from 'fs'
import path from 'path'
import XLSX from 'xlsx'

const SAMPLE_FILE = path.resolve(process.cwd(), 'sample-leads.xlsx')
const API_URL = process.env.API_URL || 'http://localhost:5000/api/leads/bulk/upload'

const sampleRows = [
  {
    name: 'Alice Johnson',
    email: 'alice.johnson+demo@example.com',
    phone: '+1 (555) 111-2222',
    companyName: 'Acme Global Industries',
    source: 'google_ads',
    leadType: 'warm',
    budget: 25000,
    notes: 'Imported sample lead',
    status: 'new',
  },
  {
    name: 'Bob Smith',
    email: 'bob.smith+demo@example.com',
    phone: '+1 (555) 333-4444',
    companyName: 'Beta Systems',
    source: 'referral',
    leadType: 'hot',
    budget: 50000,
    notes: 'Imported sample lead 2',
    status: 'contacted',
  },
]

async function writeSampleExcel(filePath) {
  const worksheet = XLSX.utils.json_to_sheet(sampleRows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')
  XLSX.writeFile(workbook, filePath)
  console.log('Wrote sample Excel to', filePath)
}

async function readExcelAsJson(filePath) {
  const workbook = XLSX.readFile(filePath)
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(worksheet)
}

async function uploadLeads(leads) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.message || 'Upload failed')
  }

  return data
}

async function main() {
  try {
    const arg = process.argv[2]
    const filePath = arg ? path.resolve(process.cwd(), arg) : SAMPLE_FILE

    if (!fs.existsSync(filePath)) {
      await writeSampleExcel(filePath)
    }

    const leads = await readExcelAsJson(filePath)
    console.log('Read', leads.length, 'rows from', filePath)

    const result = await uploadLeads(leads)
    console.log('Upload result:', JSON.stringify(result, null, 2))
  } catch (err) {
    console.error('Error:', err.message || err)
    process.exit(1)
  }
}

main()
