const DAY_MS = 24 * 60 * 60 * 1000

export const DEFAULT_LOAN_SETTINGS = {
  normalEmi: 75000,
  bankEmi: 63394,
  balanceSnapshot: 4713662,
  balanceSnapshotDate: '2026-08-04',
  firstEmiMonth: '2025-06',
  loanStartDate: '2025-04-19',
  originalTenureMonths: 180,
  rateChanges: [
    { date: '2025-04-19', annualRate: 8.2 },
    { date: '2025-06-15', annualRate: 7.7 },
    { date: '2025-12-15', annualRate: 7.45 }
  ]
}

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toUtc = (date) => Date.parse(`${date}T00:00:00Z`)

const isIsoDate = (value) => (
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(toUtc(value)).toISOString().slice(0, 10) === value
)

const createdAtMillis = (expense) => {
  const value = expense.createdAt
  if (value && typeof value.toMillis === 'function') return value.toMillis()
  if (value && typeof value.seconds === 'number') return value.seconds * 1000
  if (value instanceof Date) return value.getTime()
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const sortPayments = (payments) => [...payments].sort((a, b) => {
  const dateDifference = toUtc(a.date) - toUtc(b.date)
  if (dateDifference !== 0) return dateDifference
  const createdDifference = createdAtMillis(a) - createdAtMillis(b)
  if (createdDifference !== 0) return createdDifference
  return String(a.id || '').localeCompare(String(b.id || ''))
})

export const normalizeLoanSettings = (settings = {}) => {
  const merged = { ...DEFAULT_LOAN_SETTINGS, ...settings }
  const rateChanges = Array.isArray(settings.rateChanges) && settings.rateChanges.length > 0
    ? settings.rateChanges
    : DEFAULT_LOAN_SETTINGS.rateChanges

  return {
    normalEmi: Math.max(1, toNumber(merged.normalEmi, DEFAULT_LOAN_SETTINGS.normalEmi)),
    bankEmi: Math.max(1, toNumber(merged.bankEmi, DEFAULT_LOAN_SETTINGS.bankEmi)),
    balanceSnapshot: Math.max(0, toNumber(merged.balanceSnapshot, DEFAULT_LOAN_SETTINGS.balanceSnapshot)),
    balanceSnapshotDate: isIsoDate(merged.balanceSnapshotDate)
      ? merged.balanceSnapshotDate
      : DEFAULT_LOAN_SETTINGS.balanceSnapshotDate,
    firstEmiMonth: /^\d{4}-\d{2}$/.test(merged.firstEmiMonth || '')
      ? merged.firstEmiMonth
      : DEFAULT_LOAN_SETTINGS.firstEmiMonth,
    loanStartDate: isIsoDate(merged.loanStartDate)
      ? merged.loanStartDate
      : DEFAULT_LOAN_SETTINGS.loanStartDate,
    originalTenureMonths: Math.max(1, Math.round(toNumber(merged.originalTenureMonths, 180))),
    rateChanges: rateChanges
      .map(change => ({
        date: change.date,
        annualRate: Math.max(0, toNumber(change.annualRate))
      }))
      .filter(change => isIsoDate(change.date))
      .sort((a, b) => toUtc(a.date) - toUtc(b.date))
  }
}

const splitMonthPayments = (payments, normalEmi) => {
  const classifications = new Map()
  const explicitExtra = payments.filter(payment => payment.emiClassification === 'extra')
  const explicitRegular = payments.filter(payment => payment.emiClassification === 'regular')
  const automatic = payments.filter(payment => !['extra', 'regular'].includes(payment.emiClassification))
  let normalRemaining = normalEmi

  explicitExtra.forEach(payment => {
    classifications.set(payment.id, { regularAmount: 0, extraAmount: toNumber(payment.amount) })
  })

  explicitRegular.forEach(payment => {
    const amount = toNumber(payment.amount)
    const regularAmount = Math.min(amount, normalRemaining)
    classifications.set(payment.id, {
      regularAmount,
      extraAmount: Math.max(0, amount - regularAmount)
    })
    normalRemaining -= regularAmount
  })

  if (automatic.length > 0 && normalRemaining > 0) {
    const candidates = automatic
      .filter(payment => {
        const amount = toNumber(payment.amount)
        return amount >= normalRemaining * 0.8 && amount <= normalEmi * 1.5
      })
      .sort((a, b) => (
        Math.abs(toNumber(a.amount) - normalRemaining) - Math.abs(toNumber(b.amount) - normalRemaining)
      ))

    if (candidates.length > 0) {
      const selected = candidates[0]
      const amount = toNumber(selected.amount)
      const regularAmount = Math.min(amount, normalRemaining)
      classifications.set(selected.id, {
        regularAmount,
        extraAmount: Math.max(0, amount - regularAmount)
      })
      normalRemaining -= regularAmount
    } else if (automatic.every(payment => toNumber(payment.amount) > normalEmi * 1.5)) {
      // A lone large transfer is much more likely to be a principal prepayment
      // than the month's regular EMI. The user can still override this explicitly.
      automatic.forEach(payment => {
        classifications.set(payment.id, {
          regularAmount: 0,
          extraAmount: toNumber(payment.amount)
        })
      })
    }
  }

  automatic.forEach(payment => {
    if (classifications.has(payment.id)) return
    const amount = toNumber(payment.amount)
    const regularAmount = Math.min(amount, normalRemaining)
    classifications.set(payment.id, {
      regularAmount,
      extraAmount: Math.max(0, amount - regularAmount)
    })
    normalRemaining -= regularAmount
  })

  return classifications
}

export const classifyEmiPayments = (emiPayments = [], rawSettings = {}) => {
  const settings = normalizeLoanSettings(rawSettings)
  const validPayments = sortPayments(emiPayments.filter(payment => (
    payment?.id && isIsoDate(payment.date) && toNumber(payment.amount) > 0
  )))
  const byMonth = new Map()

  validPayments.forEach(payment => {
    const month = payment.date.slice(0, 7)
    if (!byMonth.has(month)) byMonth.set(month, [])
    byMonth.get(month).push(payment)
  })

  const classifications = new Map()

  byMonth.forEach((payments, month) => {
    if (month < settings.firstEmiMonth) {
      payments.forEach(payment => {
        classifications.set(payment.id, {
          id: payment.id,
          month,
          amount: toNumber(payment.amount),
          regularAmount: 0,
          extraAmount: toNumber(payment.amount),
          classification: 'extra'
        })
      })
      return
    }

    const monthSplits = splitMonthPayments(payments, settings.normalEmi)
    payments.forEach(payment => {
      const split = monthSplits.get(payment.id) || { regularAmount: 0, extraAmount: toNumber(payment.amount) }
      const classification = split.extraAmount > 0 && split.regularAmount > 0
        ? 'mixed'
        : split.extraAmount > 0 ? 'extra' : 'regular'
      classifications.set(payment.id, {
        id: payment.id,
        month,
        amount: toNumber(payment.amount),
        ...split,
        classification
      })
    })
  })

  return classifications
}

const rateAt = (date, rateChanges) => {
  const timestamp = toUtc(date)
  let active = rateChanges[0]?.annualRate || 0
  rateChanges.forEach(change => {
    if (toUtc(change.date) <= timestamp) active = change.annualRate
  })
  return active
}

const growAcrossRateChanges = (amount, fromDate, toDate, rateChanges) => {
  let value = amount
  let cursor = toUtc(fromDate)
  const endTimestamp = toUtc(toDate)

  while (cursor < endTimestamp) {
    const nextChange = rateChanges.find(change => toUtc(change.date) > cursor)
    const segmentEnd = Math.min(nextChange ? toUtc(nextChange.date) : endTimestamp, endTimestamp)
    const days = Math.max(0, Math.round((segmentEnd - cursor) / DAY_MS))
    const dailyRate = rateAt(new Date(cursor).toISOString().slice(0, 10), rateChanges) / 100 / 365
    value *= Math.pow(1 + dailyRate, days)
    cursor = segmentEnd
  }

  return value
}

const projectBalanceFromSnapshot = (emiPayments, settings, asOfDate) => {
  let balance = settings.balanceSnapshot
  let cursorDate = settings.balanceSnapshotDate
  const laterPayments = sortPayments(emiPayments.filter(payment => (
    isIsoDate(payment.date) &&
    payment.date > settings.balanceSnapshotDate &&
    payment.date <= asOfDate
  )))

  laterPayments.forEach(payment => {
    balance = growAcrossRateChanges(balance, cursorDate, payment.date, settings.rateChanges)
    balance = Math.max(0, balance - toNumber(payment.amount))
    cursorDate = payment.date
  })

  return growAcrossRateChanges(balance, cursorDate, asOfDate, settings.rateChanges)
}

const buildPayoff = (principal, annualRate, monthlyPayment) => {
  const monthlyRate = annualRate / 1200
  let balance = principal
  let interest = 0
  let months = 0

  while (balance > 0.005 && months < 1200) {
    const interestForMonth = balance * monthlyRate
    const payment = Math.min(monthlyPayment, balance + interestForMonth)
    const principalPaid = payment - interestForMonth
    if (principalPaid <= 0) return null
    balance = Math.max(0, balance - principalPaid)
    interest += interestForMonth
    months += 1
  }

  if (balance > 0.005) return null
  return { months, interest, totalPaid: principal + interest }
}

const localToday = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const calculateLoanInsights = (emiPayments = [], rawSettings = {}, requestedAsOfDate) => {
  const settings = normalizeLoanSettings(rawSettings)
  const classifications = classifyEmiPayments(emiPayments, settings)
  const latestPaymentDate = emiPayments
    .map(payment => payment.date)
    .filter(isIsoDate)
    .sort()
    .at(-1)
  const asOfDate = [requestedAsOfDate, localToday(), latestPaymentDate, settings.balanceSnapshotDate]
    .filter(isIsoDate)
    .sort()
    .at(-1)
  const currentRate = rateAt(asOfDate, settings.rateChanges)
  const currentBalance = projectBalanceFromSnapshot(emiPayments, settings, asOfDate)
  const classifiedPayments = sortPayments(emiPayments)
    .map(payment => ({ ...payment, ...classifications.get(payment.id) }))
    .filter(payment => payment.classification)

  const historical = classifiedPayments.reduce((summary, payment) => {
    summary.totalPaid += toNumber(payment.amount)
    summary.regularPaid += payment.regularAmount
    summary.extraPaid += payment.extraAmount
    if (payment.extraAmount > 0 && payment.date <= asOfDate) {
      const impact = growAcrossRateChanges(
        payment.extraAmount,
        payment.date,
        asOfDate,
        settings.rateChanges
      )
      summary.balanceImpact += impact
      summary.pastInterestSaved += impact - payment.extraAmount
    }
    return summary
  }, { totalPaid: 0, regularPaid: 0, extraPaid: 0, balanceImpact: 0, pastInterestSaved: 0 })

  const noExtraBalance = currentBalance + historical.balanceImpact
  const actualPlan = buildPayoff(currentBalance, currentRate, settings.normalEmi)
  const noExtraPlan = buildPayoff(noExtraBalance, currentRate, settings.normalEmi)
  const bankEmiPlan = buildPayoff(currentBalance, currentRate, settings.bankEmi)
  const futureInterestSaved = actualPlan && noExtraPlan
    ? noExtraPlan.interest - actualPlan.interest
    : 0

  const monthlyBreakdown = Array.from(
    classifiedPayments.reduce((months, payment) => {
      const month = payment.month
      if (!months.has(month)) {
        months.set(month, { month, paid: 0, regular: 0, extra: 0, entries: 0 })
      }
      const summary = months.get(month)
      summary.paid += toNumber(payment.amount)
      summary.regular += payment.regularAmount
      summary.extra += payment.extraAmount
      summary.entries += 1
      return months
    }, new Map()).values()
  ).sort((a, b) => b.month.localeCompare(a.month))

  return {
    settings,
    asOfDate,
    latestPaymentDate: latestPaymentDate || null,
    paymentCount: classifiedPayments.length,
    currentRate,
    currentBalance,
    noExtraBalance,
    classifications,
    classifiedPayments,
    monthlyBreakdown,
    ...historical,
    actualPlan,
    noExtraPlan,
    bankEmiPlan,
    tenureSavedMonths: actualPlan && noExtraPlan ? noExtraPlan.months - actualPlan.months : 0,
    futureInterestSaved,
    lifetimeInterestSaved: historical.pastInterestSaved + futureInterestSaved
  }
}

export const previewEmiClassification = (emiPayments, payment, settings) => {
  if (!payment || !isIsoDate(payment.date) || toNumber(payment.amount) <= 0) return null
  const previewId = '__emi_preview__'
  const withoutEditedPayment = emiPayments.filter(item => item.id !== payment.editingId)
  const classifications = classifyEmiPayments([
    ...withoutEditedPayment,
    { ...payment, id: previewId, createdAt: new Date() }
  ], settings)
  return classifications.get(previewId) || null
}

export const formatTenure = (months) => {
  if (!Number.isFinite(months) || months <= 0) return '0 months'
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (years === 0) return `${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`
  if (remainingMonths === 0) return `${years} year${years === 1 ? '' : 's'}`
  return `${years}y ${remainingMonths}m`
}
