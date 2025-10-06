function ExpenseList({
  expenses,
  onEdit,
  onDelete,
  forceLabel,
  forceBadgeColor,
  emptyTitle = 'No expenses yet',
  emptyBody = 'Start logging expenses to populate your dashboard.'
}) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const typeMeta = {
    miscellaneous: {
      label: 'Miscellaneous',
      color: '#6f42c1'
    },
    bankLoan: {
      label: 'Bank Loan',
      color: '#0b69c7'
    },
    cash: {
      label: 'Cash Payment',
      color: '#0f9d58'
    },
    emi: {
      label: 'EMI Payment',
      color: '#ff8c42'
    }
  }

  const groupedExpenses = expenses.reduce((groups, expense) => {
    const key = forceLabel ? 'all' : expense.type
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(expense)
    return groups
  }, {})

  const groupTotal = (type) => groupedExpenses[type]
    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)

  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <h3>{emptyTitle}</h3>
        <p>{emptyBody}</p>
      </div>
    )
  }

  return (
    <div className="expense-groups">
      {Object.keys(groupedExpenses).map(type => {
        const meta = forceLabel
          ? { label: forceLabel, color: forceBadgeColor || '#ff8c42' }
          : typeMeta[type] || { label: type, color: '#6c757d' }

        return (
          <article key={type} className="expense-group card">
            <header className="expense-group__header">
              <span className="expense-group__badge" style={{ backgroundColor: meta.color }} />
              <div>
                <h3>{meta.label}</h3>
                <p>{groupedExpenses[type].length} entr{groupedExpenses[type].length === 1 ? 'y' : 'ies'}</p>
              </div>
              <span className="expense-group__total">{formatCurrency(groupTotal(type))}</span>
            </header>

            <div className="expense-group__body">
              {groupedExpenses[type].map(expense => (
                <div key={expense.id} className="expense-row">
                  <div className="expense-row__details">
                    <span className="expense-row__title">{expense.description}</span>
                    <span className="expense-row__date">
                      {expense.date ? new Date(expense.date).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      }) : 'No date'}
                    </span>
                  </div>

                  <div className="expense-row__meta">
                    <span className="expense-row__amount">{formatCurrency(expense.amount)}</span>
                    <div className="expense-row__actions">
                      <button
                        onClick={() => onEdit(expense)}
                        className="btn btn-ghost"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this expense?')) {
                            onDelete(expense.id)
                          }
                        }}
                        className="btn btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default ExpenseList
