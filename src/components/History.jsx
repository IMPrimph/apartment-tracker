import { useState, useMemo } from 'react'
import { formatCurrency } from '../utils/formatCurrency'

const TYPE_META = {
  bankLoan: { label: 'Bank Loan', color: '#3b82f6' },
  cash: { label: 'Cash Payment', color: '#10b981' },
  emi: { label: 'EMI Payment', color: '#f59e0b' },
  miscellaneous: { label: 'Miscellaneous', color: '#8b5cf6' }
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'bankLoan', label: 'Bank Loan' },
  { value: 'cash', label: 'Cash' },
  { value: 'emi', label: 'EMI' },
  { value: 'miscellaneous', label: 'Misc' }
]

// Use T00:00:00 suffix to parse as local time, not UTC — prevents off-by-one day in IST
const parseLocalDate = (dateStr) => dateStr ? new Date(dateStr + 'T00:00:00') : new Date(0)

const formatDate = (dateStr) => {
  if (!dateStr) return 'No date'
  return parseLocalDate(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getMonthKey = (dateStr) => {
  if (!dateStr) return 'Unknown'
  return parseLocalDate(dateStr).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase()
}

function History({ expenses, onEdit, onExport, emiClassifications }) {
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState('all')

  const grouped = useMemo(() => {
    const filtered = filter === 'all'
      ? expenses
      : expenses.filter(e => e.type === filter)

    const sorted = [...filtered].sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date))

    return sorted.reduce((acc, expense) => {
      const key = getMonthKey(expense.date)
      if (!acc[key]) acc[key] = []
      acc[key].push(expense)
      return acc
    }, {})
  }, [expenses, filter])

  const handleExport = (e) => {
    e.stopPropagation()
    onExport()
  }

  const handleRowClick = (expense) => {
    onEdit(expense)
    document.getElementById('quick-add')?.scrollIntoView({ behavior: 'smooth' })
  }

  const totalFiltered = Object.values(grouped).reduce((sum, items) => sum + items.length, 0)

  return (
    <section className="history">
      <header
        className="history__header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(!expanded)
          }
        }}
        aria-expanded={expanded}
      >
        <div className="history__header-left">
          <span className="history__title">Recent Transactions</span>
          <span className="history__count">{expenses.length} entries</span>
        </div>
        <div className="history__header-right">
          <button
            type="button"
            className="history__export"
            onClick={handleExport}
          >
            Export
          </button>
          <span className={`history__chevron ${expanded ? 'history__chevron--up' : ''}`}>
            ▼
          </span>
        </div>
      </header>

      {expanded && (
        <div className="history__body">
          <div className="history__filters">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`chip chip--sm ${filter === opt.value ? 'chip--active' : ''}`}
                onClick={() => setFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {totalFiltered === 0 && (
            <div className="history__empty">No transactions found.</div>
          )}

          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <div className="history__month">{month}</div>
              {items.map(expense => {
                const meta = TYPE_META[expense.type] || { label: expense.type, color: '#6c757d' }
                const emiSplit = expense.type === 'emi' ? emiClassifications?.get(expense.id) : null
                return (
                  <div
                    key={expense.id}
                    className="history__row"
                    onClick={() => handleRowClick(expense)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Edit ${expense.description || meta.label} - ${formatCurrency(expense.amount)}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleRowClick(expense)
                      }
                    }}
                  >
                    <div className="history__row-left">
                      <span
                        className="history__dot"
                        style={{ backgroundColor: meta.color }}
                      />
                      <div>
                        <div className="history__row-label">
                          {expense.description || meta.label}
                        </div>
                        <div className="history__row-date">{formatDate(expense.date)}</div>
                        {emiSplit && (
                          <div className="history__emi-split">
                            {emiSplit.regularAmount > 0 && <span>{formatCurrency(emiSplit.regularAmount)} normal</span>}
                            {emiSplit.extraAmount > 0 && <span className="history__emi-extra">{formatCurrency(emiSplit.extraAmount)} extra</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="history__row-amount">{formatCurrency(expense.amount)}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default History
