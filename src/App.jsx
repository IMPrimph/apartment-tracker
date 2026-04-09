import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Dashboard from './components/Dashboard'
import QuickAdd from './components/QuickAdd'
import History from './components/History'
import AuthGate from './components/AuthGate'
import { formatCurrency } from './utils/formatCurrency'
import { initializeFirebase, addExpense, getExpenses, updateExpense, deleteExpense } from './firebase'

function TrackerApp() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
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
      const expenseList = await getExpenses()
      setExpenses(expenseList)
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

  const handleExport = useCallback(async () => {
    if (expenses.length === 0) {
      showNotification('No expenses to export.', 'error')
      return
    }
    try {
      const { exportExpensesToExcel } = await import('./utils/exportToExcel')
      exportExpensesToExcel(expenses)
      showNotification('Export created')
    } catch (error) {
      console.error('Export error:', error)
      showNotification('Failed to export.', 'error')
    }
  }, [expenses, showNotification])

  // All hooks must be above any early returns — Rules of Hooks
  const costExpenses = useMemo(() => expenses.filter(e => e.type === 'bankLoan' || e.type === 'cash'), [expenses])
  const emiPayments = useMemo(() => expenses.filter(e => e.type === 'emi'), [expenses])
  const miscExpenses = useMemo(() => expenses.filter(e => e.type === 'miscellaneous'), [expenses])

  const lastEmiAmount = useMemo(() => {
    const sorted = [...emiPayments].sort((a, b) => {
      const da = a.date ? new Date(a.date + 'T00:00:00') : new Date(0)
      const db = b.date ? new Date(b.date + 'T00:00:00') : new Date(0)
      return db - da
    })
    return sorted.length > 0 ? (parseFloat(sorted[0].amount) || 0) : 0
  }, [emiPayments])

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
        <Dashboard
          expenses={costExpenses}
          emiPayments={emiPayments}
          miscExpenses={miscExpenses}
        />

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
          lastEmiAmount={lastEmiAmount}
        />

        <History
          expenses={expenses}
          allExpenses={expenses}
          onEdit={handleEdit}
          onExport={handleExport}
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
