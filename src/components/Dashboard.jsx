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

  const getQuickStats = () => {
    const allExpenses = [...expenses, ...emiPayments, ...miscellaneousExpenses]
    const totalTransactions = allExpenses.length
    
    if (totalTransactions === 0) return null

    const latestExpense = allExpenses
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))[0]
    
    const thisMonth = new Date().toISOString().slice(0, 7)
    const thisMonthExpenses = allExpenses.filter(exp => 
      (exp.date || exp.createdAt)?.startsWith(thisMonth)
    )
    const thisMonthTotal = thisMonthExpenses.reduce((sum, exp) => 
      sum + (parseFloat(exp.amount) || 0), 0
    )

    return { totalTransactions, latestExpense, thisMonthTotal, thisMonthCount: thisMonthExpenses.length }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const totals = calculateTotals()
  const quickStats = getQuickStats()
  const apartmentCost = 10000000 // 1 crore
  const remainingCost = apartmentCost - totals.total
  const progress = Math.min((totals.total / apartmentCost) * 100, 100)

  return (
    <section className="stats-section">
      {quickStats && (
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="quick-stat__label">Total Transactions</span>
            <span className="quick-stat__value">{quickStats.totalTransactions}</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat__label">This Month</span>
            <span className="quick-stat__value">₹{quickStats.thisMonthTotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat__label">Monthly Entries</span>
            <span className="quick-stat__value">{quickStats.thisMonthCount}</span>
          </div>
        </div>
      )}
      <div className="stats-grid stats-grid--wide">
        <article className="stat-card stat-card--primary">
          <span className="stat-card__eyebrow">Total Invested</span>
          <h3 className="stat-card__value">{formatCurrency(totals.total)}</h3>
          <span className="stat-card__meta">of {formatCurrency(apartmentCost)} target</span>
          <div className="stat-progress">
            <div className="stat-progress__bar">
              <span style={{ width: `${progress}%` }} />
            </div>
            <span className="stat-progress__label">{progress.toFixed(1)}% complete</span>
          </div>
        </article>

        <article className="stat-card">
          <span className="stat-card__eyebrow">Bank Loan</span>
          <h3 className="stat-card__value" style={{ color: '#3b82f6' }}>
            {formatCurrency(totals.bankLoan)}
          </h3>
          <span className="stat-card__meta">Disbursed amount</span>
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
