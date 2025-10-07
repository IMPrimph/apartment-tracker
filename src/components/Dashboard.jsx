function Dashboard({ expenses, emiPayments = [], miscellaneousExpenses = [] }) {
  const calculateTotals = () => {
    const totals = {
      miscellaneous: 0,
      bankLoan: 0,
      cash: 0,
      emi: 0,
      total: 0
    }

    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount) || 0
      totals[expense.type] += amount
      totals.total += amount
    })

    const emiTotal = emiPayments.reduce((sum, payment) => {
      const amount = parseFloat(payment.amount) || 0
      return sum + amount
    }, 0)

    const miscTotal = miscellaneousExpenses.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0
      return sum + amount
    }, 0)

    return { ...totals, emi: emiTotal, miscellaneous: miscTotal }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const totals = calculateTotals()
  const apartmentCost = 10000000 // 1 crore
  const bankLoanCap = 7500000 // 75 lakhs
  const projectRemaining = Math.max(apartmentCost - totals.total, 0)
  const bankLoanRemaining = Math.max(bankLoanCap - totals.bankLoan, 0)
  const progress = Math.min((totals.total / apartmentCost) * 100, 100)

  return (
    <section className="stats-section">
      <div className="stats-grid stats-grid--wide">
        <article className="stat-card stat-card--primary">
          <span className="stat-card__eyebrow">Total Invested</span>
          <h3 className="stat-card__value">{formatCurrency(totals.total)}</h3>
          <span className="stat-card__meta">Target {formatCurrency(apartmentCost)}</span>
          <div className="stat-progress">
            <div className="stat-progress__bar">
              <span style={{ width: `${progress}%` }} />
            </div>
            <span className="stat-progress__label">
              Pending {formatCurrency(projectRemaining)} · {progress.toFixed(1)}% complete
            </span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-card__eyebrow">Bank Loan</span>
          <h3 className="stat-card__value" style={{ color: '#3b82f6' }}>
            {formatCurrency(totals.bankLoan)}
          </h3>
          <span className="stat-card__meta">
            Disbursed amount of {formatCurrency(bankLoanCap)}
          </span>
          <span className="stat-card__meta">
            Pending {formatCurrency(bankLoanRemaining)}
          </span>
        </article>

        <article className="stat-card">
          <span className="stat-card__eyebrow">Cash Payments</span>
          <h3 className="stat-card__value" style={{ color: '#10b981' }}>
            {formatCurrency(totals.cash)}
          </h3>
          <span className="stat-card__meta">Out of pocket</span>
        </article>

        <article className="stat-card">
          <span className="stat-card__eyebrow">EMI Paid</span>
          <h3 className="stat-card__value" style={{ color: '#f59e0b' }}>
            {formatCurrency(totals.emi)}
          </h3>
          <span className="stat-card__meta">Monthly repayments</span>
        </article>

        <article className="stat-card">
          <span className="stat-card__eyebrow">Miscellaneous</span>
          <h3 className="stat-card__value" style={{ color: '#8b5cf6' }}>
            {formatCurrency(totals.miscellaneous)}
          </h3>
          <span className="stat-card__meta">Extra costs</span>
        </article>
      </div>
    </section>
  )
}

export default Dashboard
