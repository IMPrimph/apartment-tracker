import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateLoanInsights,
  classifyEmiPayments,
  DEFAULT_LOAN_SETTINGS,
  previewEmiClassification
} from './loanCalculations.js'

const paymentRows = [
  ['2025-05-13', 10], ['2025-05-13', 43000], ['2025-05-20', 3000],
  ['2025-05-21', 30000], ['2025-05-21', 6000], ['2025-05-21', 6000],
  ['2025-05-22', 49900], ['2025-05-22', 50000], ['2025-05-22', 100],
  ['2025-05-22', 100], ['2025-05-22', 6000], ['2025-05-23', 50000],
  ['2025-05-23', 50000], ['2025-05-24', 50000], ['2025-05-24', 50000],
  ['2025-05-25', 50000], ['2025-05-25', 50000],
  ['2025-06-01', 50000], ['2025-06-01', 50000], ['2025-06-15', 10], ['2025-06-15', 75000],
  ['2025-07-02', 75000], ['2025-07-03', 100], ['2025-07-03', 50000],
  ['2025-07-03', 49850], ['2025-07-03', 100], ['2025-07-03', 99900],
  ['2025-07-24', 1], ['2025-07-24', 10000],
  ['2025-08-09', 50000], ['2025-08-09', 50000], ['2025-08-09', 99000], ['2025-08-19', 75000],
  ['2025-09-02', 75000], ['2025-10-07', 78000], ['2025-11-04', 78000],
  ['2025-11-24', 1], ['2025-12-06', 75000], ['2025-12-31', 10000],
  ['2026-01-07', 75000], ['2026-02-04', 100], ['2026-02-04', 75000], ['2026-02-24', 1],
  ['2026-03-06', 80000], ['2026-03-24', 1], ['2026-04-06', 80000], ['2026-04-24', 1],
  ['2026-05-09', 80000], ['2026-05-24', 1], ['2026-06-02', 80000], ['2026-06-24', 1],
  ['2026-07-02', 75000], ['2026-07-22', 200000], ['2026-07-24', 1],
  ['2026-08-03', 80000], ['2026-08-04', 1], ['2026-08-04', 75000],
  ['2026-08-04', 10], ['2026-08-04', 95000], ['2026-08-13', 50000],
  ['2026-08-13', 10], ['2026-08-13', 40000]
]

const historicPayments = paymentRows.map(([date, amount], index) => ({
  id: `payment-${String(index).padStart(2, '0')}`,
  type: 'emi',
  date,
  amount,
  createdAt: new Date(`${date}T12:00:${String(index % 60).padStart(2, '0')}Z`)
}))

test('classifies the complete supplied history against a ₹75,000 monthly baseline', () => {
  const classifications = classifyEmiPayments(historicPayments, DEFAULT_LOAN_SETTINGS)
  const totals = [...classifications.values()].reduce((summary, payment) => ({
    regular: summary.regular + payment.regularAmount,
    extra: summary.extra + payment.extraAmount
  }), { regular: 0, extra: 0 })

  assert.equal(totals.regular, 1125000)
  assert.equal(totals.extra, 1504199)
  assert.equal(totals.regular + totals.extra, 2629199)
})

test('identifies a normal EMI and a separate lump sum even when the lump sum was paid first', () => {
  const payments = [
    { id: 'extra-first', date: '2026-09-01', amount: 100000 },
    { id: 'normal-later', date: '2026-09-07', amount: 75000 }
  ]
  const classifications = classifyEmiPayments(payments, DEFAULT_LOAN_SETTINGS)

  assert.equal(classifications.get('extra-first').extraAmount, 100000)
  assert.equal(classifications.get('normal-later').regularAmount, 75000)
})

test('manual extra override keeps an unusual payment fully attributed to savings', () => {
  const preview = previewEmiClassification([], {
    date: '2026-09-01',
    amount: 80000,
    emiClassification: 'extra'
  }, DEFAULT_LOAN_SETTINGS)

  assert.equal(preview.regularAmount, 0)
  assert.equal(preview.extraAmount, 80000)
  assert.equal(preview.classification, 'extra')
})

test('auto classification treats a standalone large lump sum as extra principal', () => {
  const preview = previewEmiClassification([], {
    date: '2026-09-01',
    amount: 200000,
    emiClassification: 'auto'
  }, DEFAULT_LOAN_SETTINGS)

  assert.equal(preview.regularAmount, 0)
  assert.equal(preview.extraAmount, 200000)
})

test('rebuilds savings, balance impact, and tenure from all historical payments', () => {
  const insights = calculateLoanInsights(historicPayments, DEFAULT_LOAN_SETTINGS, '2026-08-13')

  assert.equal(insights.totalPaid, 2629199)
  assert.equal(insights.extraPaid, 1504199)
  assert.ok(insights.balanceImpact > insights.extraPaid)
  assert.ok(insights.pastInterestSaved > 90000)
  assert.ok(insights.lifetimeInterestSaved > 1300000)
  assert.ok(insights.tenureSavedMonths >= 38)
  assert.ok(insights.actualPlan.months < insights.noExtraPlan.months)
})
