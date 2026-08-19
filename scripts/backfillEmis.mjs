import fs from 'node:fs'
import { initializeApp } from 'firebase/app'
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore'

const args = process.argv.slice(2)
const getArgValues = (flag) => args.flatMap((arg, index) => (
  arg === flag && args[index + 1] ? [args[index + 1]] : []
))
const source = getArgValues('--source')[0]
const extras = getArgValues('--extra')
const shouldApply = args.includes('--apply')

if (!source) {
  throw new Error('Pass the payment TSV with --source /absolute/path/to/file.txt')
}

const toIsoDate = (value) => {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value?.trim() || '')
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null
}

const expectedPayments = fs.readFileSync(source, 'utf8')
  .split(/\r?\n/)
  .slice(1)
  .map(line => {
    const [rawDate, rawAmount] = line.split('\t')
    return { date: toIsoDate(rawDate), amount: Number(rawAmount) }
  })
  .filter(payment => payment.date && Number.isFinite(payment.amount) && payment.amount > 0)

extras.forEach(value => {
  const [date, rawAmount] = value.split(':')
  const amount = Number(rawAmount)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid --extra value: ${value}. Use YYYY-MM-DD:AMOUNT.`)
  }
  expectedPayments.push({ date, amount })
})

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Firebase environment variables are missing.')
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const snapshot = await getDocs(query(collection(db, 'expenses'), orderBy('createdAt', 'desc')))
const storedEmis = snapshot.docs
  .map(record => ({ id: record.id, ...record.data() }))
  .filter(record => record.type === 'emi')

const keyFor = ({ date, amount }) => `${date}|${Number(amount)}`
const expectedCounts = new Map()
const storedCounts = new Map()

expectedPayments.forEach(payment => {
  const key = keyFor(payment)
  expectedCounts.set(key, (expectedCounts.get(key) || 0) + 1)
})

storedEmis.forEach(payment => {
  const key = keyFor(payment)
  storedCounts.set(key, (storedCounts.get(key) || 0) + 1)
})

let missing = []
for (const [key, expectedCount] of expectedCounts) {
  const storedCount = storedCounts.get(key) || 0
  const [date, rawAmount] = key.split('|')
  const amount = Number(rawAmount)
  for (let occurrence = storedCount + 1; occurrence <= expectedCount; occurrence += 1) {
    missing.push({ date, amount, occurrence })
  }
}

const unmatchedStored = []
for (const [key, storedCount] of storedCounts) {
  const expectedCount = expectedCounts.get(key) || 0
  if (storedCount > expectedCount) {
    const [date, rawAmount] = key.split('|')
    unmatchedStored.push({
      date,
      amount: Number(rawAmount),
      occurrences: storedCount - expectedCount
    })
  }
}

const monthFor = ({ date }) => date.slice(0, 7)
const reconciledMonthDifferences = []
const reconciledMissing = new Set()
const unresolvedUnmatchedStored = []

const findSubset = (payments, target, start = 0) => {
  if (target === 0) return []
  for (let index = start; index < payments.length; index += 1) {
    if (payments[index].amount > target) continue
    const remainder = findSubset(payments, target - payments[index].amount, index + 1)
    if (remainder) return [payments[index], ...remainder]
  }
  return null
}

for (const storedPayment of unmatchedStored) {
  let unresolvedOccurrences = storedPayment.occurrences
  for (let occurrence = 0; occurrence < storedPayment.occurrences; occurrence += 1) {
    const candidates = missing
      .filter(payment => (
        monthFor(payment) === monthFor(storedPayment) && !reconciledMissing.has(payment)
      ))
      .sort((a, b) => b.amount - a.amount)
    const matchedPayments = findSubset(candidates, storedPayment.amount)
    if (!matchedPayments) continue

    matchedPayments.forEach(payment => reconciledMissing.add(payment))
    unresolvedOccurrences -= 1
    reconciledMonthDifferences.push({
      month: monthFor(storedPayment),
      storedAmount: storedPayment.amount,
      representedBy: matchedPayments.map(payment => ({ date: payment.date, amount: payment.amount }))
    })
  }

  if (unresolvedOccurrences > 0) {
    unresolvedUnmatchedStored.push({ ...storedPayment, occurrences: unresolvedOccurrences })
  }
}

missing = missing.filter(payment => !reconciledMissing.has(payment))

missing.sort((a, b) => a.date.localeCompare(b.date) || a.amount - b.amount || a.occurrence - b.occurrence)
unmatchedStored.sort((a, b) => a.date.localeCompare(b.date) || a.amount - b.amount)

console.log(JSON.stringify({
  mode: shouldApply ? 'apply' : 'dry-run',
  expectedEmiCount: expectedPayments.length,
  expectedTotal: expectedPayments.reduce((sum, payment) => sum + payment.amount, 0),
  storedEmiCount: storedEmis.length,
  storedTotal: storedEmis.reduce((sum, payment) => sum + payment.amount, 0),
  missingCount: missing.length,
  missingTotal: missing.reduce((sum, payment) => sum + payment.amount, 0),
  reconciledMonthDifferences,
  unmatchedStored: unresolvedUnmatchedStored,
  missing
}, null, 2))

if (shouldApply) {
  for (const payment of missing) {
    const safeDate = payment.date.replaceAll('-', '')
    const recordId = `emi-backfill-${safeDate}-${payment.amount}-${payment.occurrence}`
    await setDoc(doc(db, 'expenses', recordId), {
      type: 'emi',
      amount: payment.amount,
      description: 'EMI Payment',
      date: payment.date,
      emiClassification: 'auto',
      createdAt: new Date(),
      importedAt: new Date(),
      importSource: 'EMI Payments sheet'
    })
  }

  console.log(`Inserted ${missing.length} missing EMI records.`)
}

process.exit(0)
