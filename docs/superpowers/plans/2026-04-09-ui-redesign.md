# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the apartment cost tracker from a ledger-first layout to a dashboard-first, quick-add-second, history-last single-page app.

**Architecture:** Single-page React app with three vertical sections: Dashboard (hero + stats), QuickAdd (inline form), History (collapsible transaction list). State managed in App.jsx, passed down as props. No new dependencies — same React, Firebase, Vite, XLSX stack.

**Tech Stack:** React 18, Vite 5, Firebase/Firestore, XLSX, CSS (custom, no framework)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/App.jsx` | Rewrite | Root state, layout, CRUD handlers |
| `src/components/Dashboard.jsx` | Rewrite | Hero progress card + 4 stat cards |
| `src/components/QuickAdd.jsx` | Create | Type chips, amount input (EMI pre-fill), date picker, save |
| `src/components/History.jsx` | Create | Collapsible transaction list, filter chips, month grouping, edit/delete |
| `src/index.css` | Rewrite | All new styles matching redesign |
| `src/components/ExpenseForm.jsx` | Delete | Replaced by QuickAdd |
| `src/components/ExpenseList.jsx` | Delete | Replaced by History |

**Unchanged files:** `src/firebase.js`, `src/utils/exportToExcel.js`, `src/components/AuthGate.jsx`, `src/main.jsx`, `vite.config.js`, `index.html`

---

### Task 1: Rewrite Dashboard Component

**Files:**
- Rewrite: `src/components/Dashboard.jsx`

- [ ] **Step 1: Rewrite Dashboard.jsx**

Replace the entire contents of `src/components/Dashboard.jsx` with:

```jsx
const APARTMENT_TARGET = 10000000
const BANK_LOAN_CAP = 7500000

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)

function Dashboard({ expenses, emiPayments, miscExpenses }) {
  const bankLoan = expenses
    .filter(e => e.type === 'bankLoan')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  const cash = expenses
    .filter(e => e.type === 'cash')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  const totalInvested = bankLoan + cash
  const progress = Math.min((totalInvested / APARTMENT_TARGET) * 100, 100)
  const remaining = Math.max(APARTMENT_TARGET - totalInvested, 0)
  const bankLoanRemaining = Math.max(BANK_LOAN_CAP - bankLoan, 0)

  const emiTotal = emiPayments.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const miscTotal = miscExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  return (
    <section className="dashboard">
      <div className="dashboard__top">
        <article className="hero-card">
          <span className="hero-card__eyebrow">Apartment Progress</span>
          <div className="hero-card__amount">
            <span className="hero-card__value">{formatCurrency(totalInvested)}</span>
            <span className="hero-card__target">/ {formatCurrency(APARTMENT_TARGET)}</span>
          </div>
          <div className="hero-card__bar">
            <div className="hero-card__bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="hero-card__meta">
            <span>{progress.toFixed(1)}% complete</span>
            <span>{formatCurrency(remaining)} remaining</span>
          </div>
        </article>

        <div className="dashboard__side">
          <article className="stat-card">
            <span className="stat-card__eyebrow">Bank Loan</span>
            <h3 className="stat-card__value">{formatCurrency(bankLoan)}</h3>
            <span className="stat-card__meta">
              {formatCurrency(bankLoanRemaining)} remaining of {formatCurrency(BANK_LOAN_CAP)}
            </span>
          </article>
          <article className="stat-card">
            <span className="stat-card__eyebrow">Cash Paid</span>
            <h3 className="stat-card__value">{formatCurrency(cash)}</h3>
            <span className="stat-card__meta">Out of pocket payments</span>
          </article>
        </div>
      </div>

      <div className="dashboard__bottom">
        <article className="stat-card stat-card--compact">
          <div className="stat-card--compact__inner">
            <div>
              <span className="stat-card__eyebrow">EMI Paid</span>
              <h3 className="stat-card__value">{formatCurrency(emiTotal)}</h3>
            </div>
            <div className="stat-card__icon stat-card__icon--amber">📅</div>
          </div>
        </article>
        <article className="stat-card stat-card--compact">
          <div className="stat-card--compact__inner">
            <div>
              <span className="stat-card__eyebrow">Miscellaneous</span>
              <h3 className="stat-card__value">{formatCurrency(miscTotal)}</h3>
            </div>
            <div className="stat-card__icon stat-card__icon--purple">🔧</div>
          </div>
        </article>
      </div>
    </section>
  )
}

export default Dashboard
```

- [ ] **Step 2: Verify it renders without errors**

Run: `cd /Users/primph/Documents/cost-tracking/apartment-tracker && npm run dev`

Open in browser — the dashboard section should render (styling will come in a later task). Check console for errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard.jsx
git commit -m "feat: rewrite Dashboard with hero progress card and stat layout"
```

---

### Task 2: Create QuickAdd Component

**Files:**
- Create: `src/components/QuickAdd.jsx`

- [ ] **Step 1: Create QuickAdd.jsx**

Create `src/components/QuickAdd.jsx` with:

```jsx
import { useState, useEffect, useRef } from 'react'

const TYPE_OPTIONS = [
  { value: 'emi', label: 'EMI' },
  { value: 'bankLoan', label: 'Bank Loan' },
  { value: 'cash', label: 'Cash' },
  { value: 'miscellaneous', label: 'Miscellaneous' }
]

const TYPE_DESCRIPTIONS = {
  emi: 'EMI Payment',
  bankLoan: 'Bank Loan Payment',
  cash: 'Cash Payment',
  miscellaneous: 'Miscellaneous'
}

const convertToWords = (num) => {
  if (!Number.isFinite(num) || num === 0) return ''
  const belowTwenty = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']

  const toWordsBelowHundred = (n) => {
    if (n < 20) return belowTwenty[n]
    const t = Math.floor(n / 10)
    const u = n % 10
    return u ? `${tens[t]} ${belowTwenty[u]}` : tens[t]
  }

  const toWordsBelowThousand = (n) => {
    const h = Math.floor(n / 100)
    const rest = n % 100
    const parts = []
    if (h) parts.push(`${belowTwenty[h]} Hundred`)
    if (rest) parts.push(toWordsBelowHundred(rest))
    return parts.join(' ')
  }

  const isNegative = num < 0
  const absolute = Math.abs(num)
  const integerPart = Math.floor(absolute)
  const decimalPart = Math.round((absolute - integerPart) * 100)

  const crores = Math.floor(integerPart / 10000000)
  const lakhs = Math.floor((integerPart % 10000000) / 100000)
  const thousands = Math.floor((integerPart % 100000) / 1000)
  const hundreds = integerPart % 1000

  const parts = []
  if (crores) parts.push(`${toWordsBelowThousand(crores)} Crore`)
  if (lakhs) parts.push(`${toWordsBelowThousand(lakhs)} Lakh`)
  if (thousands) parts.push(`${toWordsBelowThousand(thousands)} Thousand`)
  if (hundreds) parts.push(toWordsBelowThousand(hundreds))
  if (parts.length === 0) parts.push('Zero')

  let words = `${parts.join(' ')} Rupees`.replace(/\s+/g, ' ')
  if (decimalPart) words += ` and ${toWordsBelowHundred(decimalPart)} Paise`
  if (isNegative) words = `Minus ${words}`
  return words
}

function QuickAdd({ onSubmit, editingExpense, onCancelEdit, lastEmiAmount }) {
  const [selectedType, setSelectedType] = useState('emi')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const amountRef = useRef(null)

  const isEditing = !!editingExpense

  // Pre-fill when editing
  useEffect(() => {
    if (editingExpense) {
      setSelectedType(editingExpense.type || 'emi')
      setAmount(editingExpense.amount?.toString() || '')
      setDate(editingExpense.date || new Date().toISOString().split('T')[0])
    }
  }, [editingExpense])

  // EMI pre-fill: when switching to EMI type (not editing), fill last EMI amount
  useEffect(() => {
    if (selectedType === 'emi' && !isEditing && lastEmiAmount > 0) {
      setAmount(lastEmiAmount.toString())
    }
  }, [selectedType, isEditing, lastEmiAmount])

  // Cmd+K shortcut to focus amount
  useEffect(() => {
    const handleKeydown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        amountRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [])

  const handleTypeChange = (type) => {
    if (isEditing) return
    setSelectedType(type)
    setError('')
    // Reset amount when switching away from EMI, or pre-fill handled by effect
    if (type !== 'emi') {
      setAmount('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (!date) {
      setError('Select a date')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onSubmit({
        type: selectedType,
        amount: parsed,
        description: TYPE_DESCRIPTIONS[selectedType] || selectedType,
        date
      })
      // Reset form after successful add (not edit — edit resets via onCancelEdit)
      if (!isEditing) {
        if (selectedType !== 'emi') setAmount('')
        setDate(new Date().toISOString().split('T')[0])
      }
    } catch {
      setError('Failed to save. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setAmount('')
    setDate(new Date().toISOString().split('T')[0])
    setSelectedType('emi')
    setError('')
    onCancelEdit()
  }

  const numericAmount = parseFloat(amount) || 0
  const wordsText = numericAmount > 0 ? convertToWords(numericAmount) : ''

  return (
    <section className="quick-add" id="quick-add">
      <form onSubmit={handleSubmit} className="quick-add__form">
        <div className="quick-add__header">
          <span className="quick-add__title">
            {isEditing ? 'Edit Payment' : 'Add Payment'}
          </span>
        </div>

        <div className="quick-add__chips">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`chip ${selectedType === opt.value ? 'chip--active' : ''}`}
              onClick={() => handleTypeChange(opt.value)}
              disabled={isEditing}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="quick-add__row">
          <div className="quick-add__amount-wrapper">
            <span className="quick-add__rupee">₹</span>
            <input
              ref={amountRef}
              type="number"
              className="quick-add__amount"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError('') }}
              placeholder="Amount"
              inputMode="numeric"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e) }}
            />
          </div>
          <input
            type="date"
            className="quick-add__date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            type="submit"
            className="quick-add__save"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>

        {error && <p className="quick-add__error">{error}</p>}
        {wordsText && <p className="quick-add__words">{wordsText}</p>}

        {isEditing && (
          <div className="quick-add__edit-actions">
            <button type="button" className="quick-add__cancel" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        )}
      </form>
    </section>
  )
}

export default QuickAdd
```

- [ ] **Step 2: Verify no import errors**

Check dev server console — component won't render yet until App.jsx is updated, but there should be no syntax errors in the file.

- [ ] **Step 3: Commit**

```bash
git add src/components/QuickAdd.jsx
git commit -m "feat: create QuickAdd inline form component"
```

---

### Task 3: Create History Component

**Files:**
- Create: `src/components/History.jsx`

- [ ] **Step 1: Create History.jsx**

Create `src/components/History.jsx` with:

```jsx
import { useState } from 'react'
import { exportExpensesToExcel } from '../utils/exportToExcel'

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

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount)

const formatDate = (dateStr) => {
  if (!dateStr) return 'No date'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getMonthKey = (dateStr) => {
  if (!dateStr) return 'Unknown'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase()
}

function History({ expenses, allExpenses, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all'
    ? expenses
    : expenses.filter(e => e.type === filter)

  // Sort by date descending
  const sorted = [...filtered].sort((a, b) => {
    const da = a.date ? new Date(a.date) : new Date(0)
    const db = b.date ? new Date(b.date) : new Date(0)
    return db - da
  })

  // Group by month
  const grouped = sorted.reduce((acc, expense) => {
    const key = getMonthKey(expense.date)
    if (!acc[key]) acc[key] = []
    acc[key].push(expense)
    return acc
  }, {})

  const handleExport = (e) => {
    e.stopPropagation()
    if (allExpenses.length === 0) return
    exportExpensesToExcel(allExpenses)
  }

  const handleRowClick = (expense) => {
    onEdit(expense)
    // Scroll to quick-add form
    document.getElementById('quick-add')?.scrollIntoView({ behavior: 'smooth' })
  }

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

          {sorted.length === 0 && (
            <div className="history__empty">No transactions found.</div>
          )}

          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <div className="history__month">{month}</div>
              {items.map(expense => {
                const meta = TYPE_META[expense.type] || { label: expense.type, color: '#6c757d' }
                return (
                  <div
                    key={expense.id}
                    className="history__row"
                    onClick={() => handleRowClick(expense)}
                    role="button"
                    tabIndex={0}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/History.jsx
git commit -m "feat: create History collapsible transaction list component"
```

---

### Task 4: Rewrite App.jsx

**Files:**
- Rewrite: `src/App.jsx`

- [ ] **Step 1: Rewrite App.jsx**

Replace the entire contents of `src/App.jsx` with:

```jsx
import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import QuickAdd from './components/QuickAdd'
import History from './components/History'
import AuthGate from './components/AuthGate'
import { initializeFirebase, addExpense, getExpenses, updateExpense, deleteExpense } from './firebase'

function TrackerApp() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)

  useEffect(() => {
    initializeFirebase()
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    try {
      const expenseList = await getExpenses()
      setExpenses(expenseList)
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleSubmit = async (data) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, data)
        setEditingExpense(null)
        showNotification('Payment updated')
      } else {
        await addExpense(data)
        showNotification('Payment added')
      }
      await loadExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
      showNotification('Failed to save. Try again.', 'error')
      throw error
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return
    try {
      await deleteExpense(id)
      await loadExpenses()
      setEditingExpense(null)
      showNotification('Transaction deleted')
    } catch (error) {
      console.error('Error deleting expense:', error)
      showNotification('Failed to delete. Try again.', 'error')
    }
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
  }

  const handleCancelEdit = () => {
    setEditingExpense(null)
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  const costExpenses = expenses.filter(e => e.type === 'bankLoan' || e.type === 'cash')
  const emiPayments = expenses.filter(e => e.type === 'emi')
  const miscExpenses = expenses.filter(e => e.type === 'miscellaneous')

  // Get last EMI amount for pre-fill
  const sortedEmi = [...emiPayments].sort((a, b) => {
    const da = a.date ? new Date(a.date) : new Date(0)
    const db = b.date ? new Date(b.date) : new Date(0)
    return db - da
  })
  const lastEmiAmount = sortedEmi.length > 0 ? (parseFloat(sortedEmi[0].amount) || 0) : 0

  return (
    <div className="app-shell">
      <div className="container">
        <Dashboard
          expenses={[...costExpenses]}
          emiPayments={emiPayments}
          miscExpenses={miscExpenses}
        />

        <QuickAdd
          onSubmit={handleSubmit}
          editingExpense={editingExpense}
          onCancelEdit={handleCancelEdit}
          lastEmiAmount={lastEmiAmount}
        />

        {editingExpense && (
          <div className="edit-bar">
            <span>Editing: {editingExpense.description || editingExpense.type} — {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(editingExpense.amount)}</span>
            <button type="button" className="edit-bar__delete" onClick={() => handleDelete(editingExpense.id)}>
              Delete
            </button>
          </div>
        )}

        <History
          expenses={expenses}
          allExpenses={expenses}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {notification && (
        <div className={`notification notification--${notification.type}`}>
          <div className="notification__content">
            <span className="notification__message">{notification.message}</span>
            <button
              className="notification__close"
              onClick={() => setNotification(null)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <AuthGate>
      <TrackerApp />
    </AuthGate>
  )
}

export default App
```

- [ ] **Step 2: Delete old components**

```bash
rm src/components/ExpenseForm.jsx src/components/ExpenseList.jsx
```

- [ ] **Step 3: Verify the app loads without runtime errors**

Check the dev server in the browser. All three sections should render (unstyled). Console should have no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git add -u src/components/ExpenseForm.jsx src/components/ExpenseList.jsx
git commit -m "feat: rewrite App.jsx with new layout, remove ExpenseForm and ExpenseList"
```

---

### Task 5: Rewrite CSS

**Files:**
- Rewrite: `src/index.css`

- [ ] **Step 1: Rewrite index.css**

Replace the entire contents of `src/index.css` with the new stylesheet. This is a complete rewrite — the file is large, so here is the full CSS organized by section:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ========== VARIABLES ========== */
:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --border: #e2e8f0;
  --border-light: #f1f5f9;
  --text: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --accent: #3b82f6;
  --accent-light: #60a5fa;
  --hero-from: #1e293b;
  --hero-to: #334155;
  --chip-bg: #f1f5f9;
  --chip-text: #475569;
  --amber-bg: #fef3c7;
  --purple-bg: #ede9fe;
  --danger: #ef4444;
  --radius-lg: 16px;
  --radius-md: 12px;
  --radius-sm: 8px;
  --radius-pill: 99px;
  --shadow-sm: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1);
}

/* ========== RESET ========== */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* ========== LAYOUT ========== */
.app-shell { min-height: 100vh; padding: 24px 0 64px; }
.container { max-width: 960px; margin: 0 auto; padding: 0 20px; }

/* ========== LOADING ========== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
  color: var(--text-muted);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ========== DASHBOARD ========== */
.dashboard { margin-bottom: 20px; }

.dashboard__top {
  display: flex;
  gap: 1.25rem;
  margin-bottom: 1rem;
}

.dashboard__side {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Hero Card */
.hero-card {
  flex: 1.5;
  background: linear-gradient(135deg, var(--hero-from) 0%, var(--hero-to) 100%);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  color: white;
}

.hero-card__eyebrow {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  opacity: 0.6;
}

.hero-card__amount {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0.5rem 0 0.25rem;
}

.hero-card__value { font-size: 2.25rem; font-weight: 700; }
.hero-card__target { font-size: 0.9rem; opacity: 0.5; }

.hero-card__bar {
  background: rgba(255,255,255,0.15);
  border-radius: var(--radius-pill);
  height: 8px;
  margin: 1rem 0 0.75rem;
  overflow: hidden;
}

.hero-card__bar-fill {
  background: linear-gradient(90deg, var(--accent), var(--accent-light));
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width 0.5s ease;
}

.hero-card__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  opacity: 0.6;
}

/* Stat Cards */
.stat-card {
  flex: 1;
  background: var(--surface);
  border-radius: 14px;
  padding: 1.25rem;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-card__eyebrow {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}

.stat-card__value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.stat-card__meta {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

/* Compact stat cards (EMI, Misc) */
.dashboard__bottom {
  display: flex;
  gap: 1rem;
}

.stat-card--compact { padding: 1rem 1.25rem; }

.stat-card--compact__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card--compact .stat-card__value { font-size: 1.15rem; }

.stat-card__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.stat-card__icon--amber { background: var(--amber-bg); }
.stat-card__icon--purple { background: var(--purple-bg); }

/* ========== QUICK ADD ========== */
.quick-add { margin-bottom: 20px; }

.quick-add__form {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--border);
}

.quick-add__header { margin-bottom: 1rem; }

.quick-add__title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

/* Chips (shared between QuickAdd and History) */
.quick-add__chips, .history__filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.chip {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--chip-bg);
  color: var(--chip-text);
  transition: all 0.15s ease;
  font-family: inherit;
}

.chip:hover { border-color: var(--text-muted); }

.chip--active {
  background: var(--text);
  color: white;
  border-color: var(--text);
}

.chip--sm { padding: 0.3rem 0.75rem; font-size: 0.72rem; }

.chip:disabled { opacity: 0.5; cursor: not-allowed; }

/* Input row */
.quick-add__row {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.quick-add__amount-wrapper {
  flex: 1.5;
  position: relative;
}

.quick-add__rupee {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 0.95rem;
  font-weight: 500;
  pointer-events: none;
}

.quick-add__amount {
  width: 100%;
  padding: 0.85rem 1rem 0.85rem 2rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text);
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
  -moz-appearance: textfield;
}

.quick-add__amount::-webkit-inner-spin-button,
.quick-add__amount::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.quick-add__amount:focus { border-color: var(--accent); }

.quick-add__date {
  flex: 0.8;
  padding: 0.85rem 1rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text);
  outline: none;
  font-family: inherit;
  text-align: center;
  transition: border-color 0.15s;
}

.quick-add__date:focus { border-color: var(--accent); }

.quick-add__save {
  padding: 0.85rem 2rem;
  background: var(--text);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: opacity 0.15s;
}

.quick-add__save:hover { opacity: 0.85; }
.quick-add__save:disabled { opacity: 0.5; cursor: not-allowed; }

.quick-add__error {
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: var(--danger);
}

.quick-add__words {
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.quick-add__edit-actions {
  margin-top: 0.75rem;
  display: flex;
  gap: 1rem;
}

.quick-add__cancel {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.82rem;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ========== EDIT BAR ========== */
.edit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: var(--chip-bg);
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  border: 1px dashed var(--border);
}

.edit-bar__delete {
  background: none;
  border: none;
  color: var(--danger);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}

.edit-bar__delete:hover { text-decoration: underline; }

/* ========== HISTORY ========== */
.history {
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
}

.history__header {
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.history__header:hover { background: var(--bg); }

.history__header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.history__title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
}

.history__count {
  font-size: 0.72rem;
  background: var(--chip-bg);
  color: var(--text-secondary);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-pill);
  font-weight: 500;
}

.history__header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.history__export {
  font-size: 0.78rem;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.15s;
}

.history__export:hover { color: var(--accent); }

.history__chevron {
  color: var(--text-muted);
  font-size: 0.7rem;
  transition: transform 0.2s;
}

.history__chevron--up { transform: rotate(180deg); }

.history__body {
  border-top: 1px solid var(--border-light);
}

.history__filters {
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border-light);
}

.history__empty {
  padding: 2rem 1.5rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.history__month {
  padding: 0.5rem 1.5rem;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  font-weight: 600;
  background: var(--bg);
}

.history__row {
  padding: 0.85rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid var(--border-light);
}

.history__row:hover { background: var(--bg); }
.history__row:last-child { border-bottom: none; }

.history__row-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.history__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.history__row-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text);
}

.history__row-date {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.history__row-amount {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}

/* ========== NOTIFICATION ========== */
.notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

.notification__content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: var(--text);
  color: white;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.notification--error .notification__content {
  background: var(--danger);
}

.notification__close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0;
  line-height: 1;
}

@keyframes slideUp {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* ========== AUTH (preserved from original) ========== */
.auth-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg);
}

.auth-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 2.5rem;
  max-width: 400px;
  width: 100%;
  border: 1px solid var(--border);
  text-align: center;
}

.auth-card h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.auth-subtitle {
  color: var(--text-secondary);
  font-size: 0.88rem;
  margin-bottom: 1.5rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-input {
  padding: 0.85rem 1rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  text-align: center;
}

.auth-input:focus { border-color: var(--accent); }

.auth-error {
  color: var(--danger);
  font-size: 0.82rem;
}

.auth-submit {
  padding: 0.85rem;
  background: var(--text);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.auth-submit:hover { opacity: 0.85; }

/* ========== MOBILE ========== */
@media (max-width: 768px) {
  .app-shell { padding: 16px 0 48px; }
  .container { padding: 0 16px; }

  .dashboard__top {
    flex-direction: column;
  }

  .dashboard__side {
    flex-direction: row;
  }

  .hero-card { padding: 1.5rem; }
  .hero-card__value { font-size: 1.75rem; }
  .hero-card__target { font-size: 0.8rem; }

  .stat-card__value { font-size: 1.2rem; }

  .quick-add__chips { gap: 0.4rem; }
  .chip { padding: 0.45rem 0.85rem; font-size: 0.75rem; }

  .quick-add__row { flex-wrap: wrap; }
  .quick-add__amount-wrapper { flex: 1 1 55%; }
  .quick-add__date { flex: 1 1 35%; }
  .quick-add__save {
    flex: 1 1 100%;
    padding: 0.85rem;
    text-align: center;
  }

  .history__header { padding: 0.85rem 1.25rem; }
  .history__filters { padding: 0.6rem 1.25rem; }
  .history__month { padding: 0.4rem 1.25rem; }
  .history__row { padding: 0.75rem 1.25rem; }
}

@media (max-width: 480px) {
  .dashboard__side {
    flex-direction: column;
    gap: 0.75rem;
  }

  .dashboard__bottom {
    flex-direction: column;
    gap: 0.75rem;
  }

  .hero-card__value { font-size: 1.5rem; }

  .quick-add__amount-wrapper { flex: 1 1 100%; }
  .quick-add__date { flex: 1 1 100%; }
}
```

- [ ] **Step 2: Verify the full app renders correctly**

Open the dev server in a browser. Check:
- Dashboard: hero card with progress bar, Bank Loan + Cash stacked right, EMI + Misc row below
- Quick-add: type chips, amount input, date picker, save button
- History: collapsed by default, expands on click, filter chips, month groups
- Notifications: appear bottom-right on save
- Mobile: resize browser to check responsive breakpoints

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: complete CSS rewrite for redesigned UI"
```

---

### Task 6: Smoke Test & Polish

**Files:**
- Possibly tweak: `src/App.jsx`, `src/components/QuickAdd.jsx`, `src/components/History.jsx`, `src/index.css`

- [ ] **Step 1: Test the full add-payment flow**

1. Open the app in browser
2. Select "EMI" chip — amount should pre-fill with last EMI amount
3. Change date if needed
4. Click Save — dashboard should update, notification should appear
5. Switch to "Bank Loan" chip — amount should clear
6. Enter an amount, click Save
7. Expand History — both transactions should appear, grouped by month

- [ ] **Step 2: Test edit flow**

1. Expand History
2. Click on a transaction row — page should scroll to QuickAdd form
3. Form should show "Edit Payment" header with pre-filled data
4. Chips should be disabled (can't change type while editing)
5. The edit bar below the form should show the transaction being edited + Delete link
6. Change amount, click Save — should update
7. Click Cancel — should reset the form

- [ ] **Step 3: Test delete flow**

1. Click a row in History to enter edit mode
2. Click "Delete" in the edit bar
3. Confirm the dialog
4. Transaction should disappear, dashboard should update

- [ ] **Step 4: Test mobile layout**

1. Open browser DevTools, toggle mobile view (375px width)
2. Dashboard: hero card full-width, bank/cash below, EMI/misc below
3. Quick-add: chips wrap, amount + date stack, save full-width
4. History: works same as desktop but with tighter padding

- [ ] **Step 5: Test Excel export**

1. Expand History
2. Click "Export" link
3. Excel file should download with multi-sheet workbook

- [ ] **Step 6: Fix any issues found during testing**

Address any layout, interaction, or rendering bugs discovered in steps 1-5.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "fix: polish and bug fixes from smoke testing"
```

Only create this commit if changes were made in step 6. If everything worked, skip this step.
