import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import AuthGate from './components/AuthGate'
import { initializeFirebase, addExpense, getExpenses, updateExpense, deleteExpense } from './firebase'

function TrackerApp() {
  const [expenses, setExpenses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    initializeFirebase()
    loadExpenses()
  }, [])

  useEffect(() => {
    const handleKeydown = (e) => {
      // Cmd/Ctrl + K to open add expense form
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!showForm) {
          setEditingExpense(null)
          setShowForm(true)
        }
      }
      // Escape to close form
      if (e.key === 'Escape' && showForm) {
        setShowForm(false)
        setEditingExpense(null)
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [showForm])

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

  const handleAddExpense = async (expenseData) => {
    try {
      await addExpense(expenseData)
      await loadExpenses()
      setShowForm(false)
      showNotification('Expense added successfully!')
    } catch (error) {
      console.error('Error adding expense:', error)
      showNotification('Failed to add expense. Please try again.', 'error')
    }
  }

  const handleUpdateExpense = async (id, expenseData) => {
    try {
      await updateExpense(id, expenseData)
      await loadExpenses()
      setEditingExpense(null)
      setShowForm(false)
      showNotification('Expense updated successfully!')
    } catch (error) {
      console.error('Error updating expense:', error)
      showNotification('Failed to update expense. Please try again.', 'error')
    }
  }

  const handleDeleteExpense = async (id) => {
    try {
      await deleteExpense(id)
      await loadExpenses()
      showNotification('Expense deleted successfully!')
    } catch (error) {
      console.error('Error deleting expense:', error)
      showNotification('Failed to delete expense. Please try again.', 'error')
    }
  }

  const handleEditExpense = (expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h2>Loading Your Financial Data</h2>
            <p>Please wait while we fetch your apartment cost tracker...</p>
          </div>
        </div>
      </div>
    )
  }

  const filterExpensesBySearch = (expenseList) => {
    if (!searchTerm.trim()) return expenseList
    return expenseList.filter(expense =>
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.amount?.toString().includes(searchTerm)
    )
  }

  const emiPayments = filterExpensesBySearch(expenses.filter(expense => expense.type === 'emi'))
  const miscellaneousExpenses = filterExpensesBySearch(expenses.filter(expense => expense.type === 'miscellaneous'))
  const costExpenses = filterExpensesBySearch(expenses.filter(expense => expense.type !== 'emi' && expense.type !== 'miscellaneous'))

  return (
    <div className="app-shell">
      <div className="container">
        <header className="page-header">
          <div className="page-header__content">
            <p className="page-header__kicker">Personal finance dashboard</p>
            <h1>Apartment Cost Tracker</h1>
            <p className="page-header__subtitle">
              Track loan disbursements, cash payouts, EMIs, and miscellaneous spends in one clean overview.
            </p>
            <p className="page-header__hint">
              Press <kbd>⌘K</kbd> to quickly add an expense
            </p>
          </div>
          <div className="page-header__actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingExpense(null)
                setShowForm(true)
              }}
            >
              + Add Expense
            </button>
          </div>
        </header>

        <Dashboard
          expenses={expenses.filter(expense => expense.type !== 'emi' && expense.type !== 'miscellaneous')}
          emiPayments={expenses.filter(expense => expense.type === 'emi')}
          miscellaneousExpenses={expenses.filter(expense => expense.type === 'miscellaneous')}
        />

        {expenses.length > 0 && (
          <div className="search-section">
            <div className="search-input-container">
              <input
                type="text"
                placeholder="Search expenses by description or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="search-clear"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            {searchTerm && (
              <p className="search-results">
                Found {costExpenses.length + emiPayments.length + miscellaneousExpenses.length} results for "{searchTerm}"
              </p>
            )}
          </div>
        )}

        <section className="section">
          <div className="section__headline">
            <div>
              <h2>Expense Ledger</h2>
              <p>Dig into individual transactions across every payment bucket.</p>
            </div>
          </div>

          <ExpenseList
            expenses={costExpenses}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
            emptyTitle="No expenses yet"
            emptyBody="Start logging construction and loan disbursements to populate your dashboard."
          />
        </section>

        <section className="section">
          <div className="section__headline">
            <div>
              <h2>Miscellaneous Costs</h2>
              <p>One-off charges like registration, furniture, or services stay outside the apartment valuation.</p>
            </div>
          </div>

          <ExpenseList
            expenses={miscellaneousExpenses}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
            forceLabel="Miscellaneous"
            forceBadgeColor="#6f42c1"
            forceAccent="rgba(111, 66, 193, 0.16)"
            emptyTitle="No miscellaneous entries yet"
            emptyBody="Log any indirect spends related to the move—fittings, legal fees, or other extras."
          />
        </section>

        <section className="section">
          <div className="section__headline">
            <div>
              <h2>EMI Payments</h2>
              <p>Track monthly repayments separately from construction and other costs.</p>
            </div>
          </div>

          <ExpenseList
            expenses={emiPayments}
            onEdit={handleEditExpense}
            onDelete={handleDeleteExpense}
            forceLabel="EMI Payment"
            forceBadgeColor="#ff8c42"
            forceAccent="rgba(255, 140, 66, 0.18)"
            emptyTitle="No EMI payments yet"
            emptyBody="Log each month’s EMI so you can compare payouts against bank schedules."
          />
        </section>
      </div>

      <button
        className="floating-add"
        type="button"
        aria-label="Add new expense"
        onClick={() => {
          setEditingExpense(null)
          setShowForm(true)
        }}
      >
        +
      </button>

      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          onSubmit={editingExpense ?
            (data) => handleUpdateExpense(editingExpense.id, data) :
            handleAddExpense
          }
          onCancel={() => {
            setShowForm(false)
            setEditingExpense(null)
          }}
        />
      )}

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
