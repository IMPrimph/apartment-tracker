import { useState, useEffect, useRef } from 'react'
import DatePicker from './DatePicker'
import { TYPE_DESCRIPTIONS } from '../utils/constants'
import { convertToWords } from '../utils/convertToWords'

const TYPE_OPTIONS = [
  { value: 'emi', label: 'EMI' },
  { value: 'bankLoan', label: 'Bank Loan' },
  { value: 'cash', label: 'Cash' },
  { value: 'miscellaneous', label: 'Miscellaneous' }
]

function QuickAdd({ onSubmit, editingExpense, onCancelEdit, lastEmiAmount }) {
  const [selectedType, setSelectedType] = useState('emi')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const amountRef = useRef(null)
  // Track whether user has manually touched the amount field to prevent EMI pre-fill overwrite
  const userTouchedAmount = useRef(false)

  const isEditing = !!editingExpense

  // Pre-fill when editing
  useEffect(() => {
    if (editingExpense) {
      setSelectedType(editingExpense.type || 'emi')
      setAmount(editingExpense.amount?.toString() || '')
      setDescription(editingExpense.description || '')
      setDate(editingExpense.date || new Date().toISOString().split('T')[0])
      userTouchedAmount.current = true // Don't overwrite with EMI pre-fill
    }
  }, [editingExpense])

  // EMI pre-fill: only when switching to EMI type, not editing, and user hasn't touched amount
  useEffect(() => {
    if (selectedType === 'emi' && !isEditing && lastEmiAmount > 0 && !userTouchedAmount.current) {
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
    setDescription('')
    userTouchedAmount.current = false
    if (type !== 'emi') {
      setAmount('')
    } else {
      // Reset flag so EMI pre-fill kicks in
      setAmount('')
    }
  }

  const handleAmountChange = (e) => {
    userTouchedAmount.current = true
    setAmount(e.target.value)
    setError('')
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
        description: description.trim() || TYPE_DESCRIPTIONS[selectedType] || selectedType,
        date
      })
      // Reset form after successful add
      if (!isEditing) {
        userTouchedAmount.current = false
        if (selectedType !== 'emi') setAmount('')
        else setAmount(lastEmiAmount > 0 ? lastEmiAmount.toString() : '')
        setDescription('')
        setDate(new Date().toISOString().split('T')[0])
      }
    } catch {
      // Error notification already handled by App.jsx — don't show duplicate inline error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setAmount('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setSelectedType('emi')
    setError('')
    userTouchedAmount.current = false
    onCancelEdit()
  }

  const numericAmount = parseFloat(amount) || 0
  const wordsText = numericAmount > 0 ? convertToWords(numericAmount) : ''
  const showDescription = selectedType === 'miscellaneous' || isEditing

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

        {showDescription && (
          <input
            type="text"
            className="quick-add__description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this for? (optional)"
          />
        )}

        <div className="quick-add__row">
          <div className="quick-add__amount-wrapper">
            <span className="quick-add__rupee">₹</span>
            <input
              ref={amountRef}
              type="number"
              className="quick-add__amount"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Amount"
              inputMode="numeric"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit(e)
                // Block e, +, - characters in number input
                if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
              }}
            />
          </div>
          <DatePicker value={date} onChange={setDate} />
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
