import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Dashboard from './components/Dashboard'
import QuickAdd from './components/QuickAdd'
import History from './components/History'
import AuthGate from './components/AuthGate'
import LoanInsights from './components/LoanInsights'
import { formatCurrency } from './utils/formatCurrency'
import { calculateLoanInsights, DEFAULT_LOAN_SETTINGS, normalizeLoanSettings } from './utils/loanCalculations'
import {
  initializeFirebase,
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getLoanSettings,
  saveLoanSettings
} from './firebase'

function TrackerApp() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [loanSettings, setLoanSettings] = useState(DEFAULT_LOAN_SETTINGS)
  const [savingLoanSettings, setSavingLoanSettings] = useState(false)
  const notificationTimer = useRef(null)

  useEffect(() => {
    initializeFirebase()
    loadExpenses()
  }, [])

  // Cleanup notification timer on unmount
  useEffect(() => {
    return () => {
      if (notificationTimer.current) clearTimeout(notificationTimer.current)
    }
  }, [])

  const loadExpenses = async () => {
    try {
      const [expenseList, storedLoanSettings] = await Promise.all([
        getExpenses(),
        getLoanSettings().catch(error => {
          console.warn('Using default loan settings:', error)
          return null
        })
      ])
      setExpenses(expenseList)
      if (storedLoanSettings) setLoanSettings(normalizeLoanSettings(storedLoanSettings))
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const showNotification = useCallback((message, type = 'success') => {
    if (notificationTimer.current) clearTimeout(notificationTimer.current)
    setNotification({ message, type })
    notificationTimer.current = setTimeout(() => setNotification(null), 3000)
  }, [])

  const handleSubmit = async (data) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data)
      setEditingExpense(null)
      showNotification('Payment updated')
    } else {
      await addExpense(data)
      showNotification('Payment added')
    }
    await loadExpenses()
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

  const handleEdit = useCallback((expense) => {
    setEditingExpense(expense)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingExpense(null)
  }, [])

  // All hooks must be above any early returns — Rules of Hooks
  const costExpenses = useMemo(() => expenses.filter(e => e.type === 'bankLoan' || e.type === 'cash'), [expenses])
  const emiPayments = useMemo(() => expenses.filter(e => e.type === 'emi'), [expenses])
  const miscExpenses = useMemo(() => expenses.filter(e => e.type === 'miscellaneous'), [expenses])
  const loanInsights = useMemo(
    () => calculateLoanInsights(emiPayments, loanSettings),
    [emiPayments, loanSettings]
  )

  const handleJumpToAdd = useCallback(() => {
    document.getElementById('quick-add')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => document.querySelector('.quick-add__amount')?.focus(), 350)
  }, [])

  const handleExport = useCallback(async () => {
    if (expenses.length === 0) {
      showNotification('No expenses to export.', 'error')
      return
    }
    try {
      const { exportExpensesToExcel } = await import('./utils/exportToExcel')
      exportExpensesToExcel(expenses, loanInsights)
      showNotification('Export created')
    } catch (error) {
      console.error('Export error:', error)
      showNotification('Failed to export.', 'error')
    }
  }, [expenses, loanInsights, showNotification])

  const handleSaveLoanSettings = useCallback(async (nextSettings) => {
    setSavingLoanSettings(true)
    try {
      const normalized = normalizeLoanSettings(nextSettings)
      await saveLoanSettings(normalized)
      setLoanSettings(normalized)
      showNotification('Loan settings saved')
    } catch (error) {
      console.error('Error saving loan settings:', error)
      showNotification('Could not save loan settings.', 'error')
      throw error
    } finally {
      setSavingLoanSettings(false)
    }
  }, [showNotification])

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

  return (
    <div className="app-shell">
      <div className="container">
        <header className="app-header">
          <div>
            <strong>Apartment tracker</strong>
            <span>{emiPayments.length} EMI payments recorded</span>
          </div>
          <button type="button" onClick={handleJumpToAdd}>
            <span aria-hidden="true">＋</span>
            Add payment
          </button>
        </header>

        {editingExpense && (
          <div className="edit-bar">
            <span>Editing: {editingExpense.description || editingExpense.type} — {formatCurrency(editingExpense.amount)}</span>
            <button type="button" className="edit-bar__delete" onClick={() => handleDelete(editingExpense.id)}>
              Delete
            </button>
          </div>
        )}

        <QuickAdd
          onSubmit={handleSubmit}
          editingExpense={editingExpense}
          onCancelEdit={handleCancelEdit}
          emiPayments={emiPayments}
          loanSettings={loanSettings}
        />

        <LoanInsights
          insights={loanInsights}
          settings={loanSettings}
          onSaveSettings={handleSaveLoanSettings}
          savingSettings={savingLoanSettings}
        />

        <Dashboard
          expenses={costExpenses}
          emiPayments={emiPayments}
          miscExpenses={miscExpenses}
        />

        <History
          expenses={expenses}
          onEdit={handleEdit}
          onExport={handleExport}
          emiClassifications={loanInsights.classifications}
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
