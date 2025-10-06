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
  const remainingCost = apartmentCost - totals.total
  const progress = Math.min((totals.total / apartmentCost) * 100, 100)

  return (
    <section className="stats-section">
      <div className="stats-grid stats-grid--wide">
        <article className="stat-card stat-card--primary">
          <span className="stat-card__eyebrow">Total Spent</span>
          <h3 className="stat-card__value">{formatCurrency(totals.total)}</h3>
          <span className="stat-card__meta">of {formatCurrency(apartmentCost)}</span>
        </article>

        <article className="stat-card">
          <span className="stat-card__eyebrow">Remaining Cost</span>
          <h3 className="stat-card__value" style={{ color: remainingCost > 0 ? '#0f9d58' : '#ea4335' }}>
            {formatCurrency(Math.max(remainingCost, 0))}
          </h3>
          <div className="stat-progress">
            <div className="stat-progress__bar">
              <span style={{ width: `${progress}%` }} />
            </div>
            <span className="stat-progress__label">{progress.toFixed(1)}% complete</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-card__eyebrow">EMI Paid</span>
          <h3 className="stat-card__value">{formatCurrency(totals.emi)}</h3>
          <span className="stat-card__meta">Loan repayment to date</span>
        </article>

        <article className="stat-card">
          <span className="stat-card__eyebrow">Miscellaneous</span>
          <h3 className="stat-card__value">{formatCurrency(totals.miscellaneous)}</h3>
          <span className="stat-card__meta">Tracked outside apartment cost</span>
        </article>

        <article className="stat-card">
          <span className="stat-card__eyebrow">Breakdown</span>
          <ul className="breakdown-list">
            <li>
              <span>Bank Loan</span>
              <strong>{formatCurrency(totals.bankLoan)}</strong>
            </li>
            <li>
              <span>Cash Payments</span>
              <strong>{formatCurrency(totals.cash)}</strong>
            </li>
            <li>
              <span>EMI Payments</span>
              <strong>{formatCurrency(totals.emi)}</strong>
            </li>
            <li>
              <span>Miscellaneous</span>
              <strong>{formatCurrency(totals.miscellaneous)}</strong>
            </li>
          </ul>
        </article>
      </div>
    </section>
  )
}

export default Dashboard
