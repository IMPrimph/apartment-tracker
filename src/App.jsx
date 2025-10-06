import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import { initializeFirebase, addExpense, getExpenses, updateExpense, deleteExpense } from './firebase'

function App() {
  const [expenses, setExpenses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const handleAddExpense = async (expenseData) => {
    try {
      await addExpense(expenseData)
      await loadExpenses()
      setShowForm(false)
    } catch (error) {
      console.error('Error adding expense:', error)
    }
  }

  const handleUpdateExpense = async (id, expenseData) => {
    try {
      await updateExpense(id, expenseData)
      await loadExpenses()
      setEditingExpense(null)
      setShowForm(false)
    } catch (error) {
      console.error('Error updating expense:', error)
    }
  }

  const handleDeleteExpense = async (id) => {
    try {
      await deleteExpense(id)
      await loadExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const handleEditExpense = (expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  const emiPayments = expenses.filter(expense => expense.type === 'emi')
  const miscellaneousExpenses = expenses.filter(expense => expense.type === 'miscellaneous')
  const costExpenses = expenses.filter(expense => expense.type !== 'emi' && expense.type !== 'miscellaneous')

  return (
    <div className="app-shell">
      <div className="container">
        <header className="page-header">
          <div>
            <p className="page-header__kicker">Personal finance dashboard</p>
            <h1>Apartment Cost Tracker</h1>
            <p className="page-header__subtitle">
              Track loan disbursements, cash payouts, EMIs, and miscellaneous spends in one clean overview.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingExpense(null)
              setShowForm(true)
            }}
          >
            + Add Expense
          </button>
        </header>

        <Dashboard
          expenses={costExpenses}
          emiPayments={emiPayments}
          miscellaneousExpenses={miscellaneousExpenses}
        />

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
            emptyBody="Start logging construction, loan disbursements, or misc spends to populate your dashboard."
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
    </div>
  )
}

export default App
