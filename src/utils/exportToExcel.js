import * as XLSX from 'xlsx'

const APARTMENT_TARGET = 10000000 // ₹1 crore
const BANK_LOAN_CAP = 7500000 // ₹75 lakh

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
})

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const normalizeTimestamp = (value) => {
  if (!value) return ''

  if (typeof value === 'string') {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }

  return new Date(value).toISOString()
}

const buildSummarySheet = (totals, counts) => {
  const invested = totals.bankLoan + totals.cash
  const overallPending = Math.max(APARTMENT_TARGET - invested, 0)
  const bankPending = Math.max(BANK_LOAN_CAP - totals.bankLoan, 0)

  const summaryData = [
    ['Metric', 'Amount (INR)', 'Details'],
    ['Total Invested (Bank + Cash)', invested, `Pending ${INR_FORMATTER.format(overallPending)}`],
    ['Bank Loan Disbursed', totals.bankLoan, `Cap ${INR_FORMATTER.format(BANK_LOAN_CAP)}, Pending ${INR_FORMATTER.format(bankPending)}`],
    ['Cash Payments', totals.cash, 'Out of pocket'],
    ['Miscellaneous Costs', totals.miscellaneous, 'Outside valuation'],
    ['EMI Paid', totals.emi, 'Lifetime EMI payouts'],
    ['Other Expenses', totals.other, 'Uncategorised entries'],
    ['Total Transactions', counts.total, 'All records'],
    ['Bank Loan Entries', counts.bankLoan, 'Transactions tagged as bank loan'],
    ['Cash Entries', counts.cash, 'Transactions tagged as cash'],
    ['Miscellaneous Entries', counts.miscellaneous, 'Miscellaneous transactions'],
    ['EMI Entries', counts.emi, 'EMI transactions']
  ]

  return XLSX.utils.aoa_to_sheet(summaryData)
}

const buildSheetForExpenses = (title, expenses) => {
  if (expenses.length === 0) {
    return XLSX.utils.aoa_to_sheet([['No data']])
  }

  const sheetData = expenses.map(expense => ({
    Description: expense.description || '',
    Amount: toNumber(expense.amount),
    Type: expense.type || 'unknown',
    Date: normalizeTimestamp(expense.date),
    CreatedAt: normalizeTimestamp(expense.createdAt),
    UpdatedAt: normalizeTimestamp(expense.updatedAt)
  }))

  const sheet = XLSX.utils.json_to_sheet(sheetData, { skipHeader: false })
  XLSX.utils.sheet_add_aoa(sheet, [['Export', title]], { origin: 'G1' })
  return sheet
}

export const exportExpensesToExcel = (expenses = []) => {
  const workbook = XLSX.utils.book_new()

  const categories = {
    bankLoan: [],
    cash: [],
    emi: [],
    miscellaneous: [],
    other: []
  }

  const totals = {
    bankLoan: 0,
    cash: 0,
    emi: 0,
    miscellaneous: 0,
    other: 0
  }

  expenses.forEach((expense) => {
    const amount = toNumber(expense.amount)
    const type = expense.type

    if (categories[type]) {
      categories[type].push(expense)
      totals[type] += amount
    } else {
      categories.other.push(expense)
      totals.other += amount
    }
  })

  const counts = {
    total: expenses.length,
    bankLoan: categories.bankLoan.length,
    cash: categories.cash.length,
    miscellaneous: categories.miscellaneous.length,
    emi: categories.emi.length,
    other: categories.other.length
  }

  const summarySheet = buildSummarySheet(totals, counts)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

  XLSX.utils.book_append_sheet(workbook, buildSheetForExpenses('Bank Loan', categories.bankLoan), 'Bank Loan')
  XLSX.utils.book_append_sheet(workbook, buildSheetForExpenses('Cash Payments', categories.cash), 'Cash Payments')
  XLSX.utils.book_append_sheet(workbook, buildSheetForExpenses('Miscellaneous', categories.miscellaneous), 'Miscellaneous')
  XLSX.utils.book_append_sheet(workbook, buildSheetForExpenses('EMI Payments', categories.emi), 'EMI Payments')

  if (categories.other.length > 0) {
    XLSX.utils.book_append_sheet(workbook, buildSheetForExpenses('Other Expenses', categories.other), 'Other')
  }

  const allSheet = buildSheetForExpenses('All Transactions', expenses)
  XLSX.utils.book_append_sheet(workbook, allSheet, 'All Transactions')

  const fileName = `apartment-cost-tracker-${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
