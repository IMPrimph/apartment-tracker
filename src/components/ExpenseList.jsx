import { useState } from 'react'

function ExpenseList({
  expenses,
  onEdit,
  onDelete,
  forceLabel,
  forceBadgeColor,
  forceAccent,
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
      color: '#6f42c1',
      accent: 'rgba(111, 66, 193, 0.16)'
    },
    bankLoan: {
      label: 'Bank Loan',
      color: '#0b69c7',
      accent: 'rgba(11, 105, 199, 0.15)'
    },
    cash: {
      label: 'Cash Payment',
      color: '#0f9d58',
      accent: 'rgba(15, 157, 88, 0.15)'
    },
    emi: {
      label: 'EMI Payment',
      color: '#ff8c42',
      accent: 'rgba(255, 140, 66, 0.18)'
    }
  }

  const [collapsedGroups, setCollapsedGroups] = useState({})

  const groupedExpenses = expenses.reduce((groups, expense) => {
    const key = forceLabel ? 'all' : expense.type
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(expense)
    return groups
  }, {})

  const toggleGroup = (key) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

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
        const fallbackMeta = { label: type, color: '#6c757d', accent: 'rgba(108, 117, 125, 0.12)' }
        const meta = forceLabel
          ? {
              label: forceLabel,
              color: forceBadgeColor || '#ff8c42',
              accent: forceAccent || 'rgba(255, 140, 66, 0.18)'
            }
          : typeMeta[type] || fallbackMeta

        const isCollapsed = collapsedGroups[type] ?? false
        const groupId = `expense-group-${type}`

        return (
          <article key={type} className={`expense-group card ${isCollapsed ? 'expense-group--collapsed' : ''}`}>
            <header
              className={`expense-group__header ${isCollapsed ? 'is-collapsed' : ''}`}
              onClick={() => toggleGroup(type)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  toggleGroup(type)
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={!isCollapsed}
              aria-controls={groupId}
            >
              <div className="expense-group__title">
                <span className="expense-group__badge" style={{ backgroundColor: meta.color }} />
                <div>
                  <h3>{meta.label}</h3>
                  <span
                    className="expense-group__chip"
                    style={{
                      backgroundColor: meta.accent,
                      color: meta.color
                    }}
                  >
                    {groupedExpenses[type].length} entr{groupedExpenses[type].length === 1 ? 'y' : 'ies'}
                  </span>
                </div>
              </div>
              <div className="expense-group__header-actions">
                <span className="expense-group__total">{formatCurrency(groupTotal(type))}</span>
                <button
                  type="button"
                  className={`expense-group__toggle ${isCollapsed ? 'is-collapsed' : ''}`}
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </div>
            </header>

            {!isCollapsed && (
              <div className="expense-group__body" id={groupId}>
                {groupedExpenses[type].map(expense => (
                  <div key={expense.id} className="expense-row">
                    <span className="expense-row__accent" style={{ backgroundColor: meta.color }} />
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
            )}
          </article>
        )
      })}
    </div>
  )
}

export default ExpenseList
