import { useState, useEffect, useMemo, useRef } from 'react'
import DatePicker from './DatePicker'
import { TYPE_DESCRIPTIONS } from '../utils/constants'
import { convertToWords } from '../utils/convertToWords'
import { formatCurrency } from '../utils/formatCurrency'
import { previewEmiClassification } from '../utils/loanCalculations'

const TYPE_OPTIONS = [
  { value: 'emi', label: 'EMI' },
  { value: 'bankLoan', label: 'Bank disbursement' },
  { value: 'cash', label: 'Cash' },
  { value: 'miscellaneous', label: 'Other' }
]

const formatShortDate = (value) => value
  ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : ''

function QuickAdd({ onSubmit, editingExpense, onCancelEdit, emiPayments, loanSettings }) {
  const [selectedType, setSelectedType] = useState('emi')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [emiClassification, setEmiClassification] = useState('auto')
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
      setEmiClassification(editingExpense.emiClassification || 'auto')
      setDate(editingExpense.date || new Date().toISOString().split('T')[0])
      userTouchedAmount.current = true // Don't overwrite with EMI pre-fill
    }
  }, [editingExpense])

  // EMI pre-fill: only when switching to EMI type, not editing, and user hasn't touched amount
  useEffect(() => {
    if (selectedType === 'emi' && !isEditing && loanSettings.normalEmi > 0 && !userTouchedAmount.current) {
      setAmount(loanSettings.normalEmi.toString())
    }
  }, [selectedType, isEditing, loanSettings.normalEmi])

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
    setEmiClassification('auto')
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
        date,
        ...(selectedType === 'emi' ? { emiClassification } : {})
      })
      // Reset form after successful add
      if (!isEditing) {
        userTouchedAmount.current = false
        if (selectedType !== 'emi') setAmount('')
        else setAmount(loanSettings.normalEmi > 0 ? loanSettings.normalEmi.toString() : '')
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
    setEmiClassification('auto')
    setError('')
    userTouchedAmount.current = false
    onCancelEdit()
  }

  const numericAmount = parseFloat(amount) || 0
  const wordsText = numericAmount > 0 ? convertToWords(numericAmount) : ''
  const showDescription = selectedType === 'miscellaneous' || isEditing
  const latestEmiDate = useMemo(() => emiPayments
    .map(payment => payment.date)
    .filter(Boolean)
    .sort()
    .at(-1), [emiPayments])
  const hasMatchingPayment = useMemo(() => selectedType === 'emi' && numericAmount > 0 && emiPayments.some(payment => (
    payment.id !== editingExpense?.id &&
    payment.date === date &&
    Number(payment.amount) === numericAmount
  )), [selectedType, numericAmount, emiPayments, editingExpense?.id, date])
  const emiPreview = useMemo(() => selectedType === 'emi'
    ? previewEmiClassification(emiPayments, {
        amount: numericAmount,
        date,
        emiClassification,
        editingId: editingExpense?.id
      }, loanSettings)
    : null, [selectedType, emiPayments, numericAmount, date, emiClassification, editingExpense?.id, loanSettings])

  return (
    <section className="quick-add" id="quick-add">
      <form onSubmit={handleSubmit} className="quick-add__form">
        <div className="quick-add__header">
          <div>
            <span className="quick-add__eyebrow">Quick entry</span>
            <h2 className="quick-add__title">
              {isEditing ? 'Edit payment' : 'Add a payment'}
            </h2>
          </div>
          {latestEmiDate && !isEditing && (
            <span className="quick-add__last-payment">Last EMI: {formatShortDate(latestEmiDate)}</span>
          )}
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

        {selectedType === 'emi' && (
          <div className="quick-add__emi-mode">
            <span>How should this payment be treated?</span>
            <div>
              {[
                { value: 'auto', label: 'Auto classify' },
                { value: 'regular', label: 'Normal EMI' },
                { value: 'extra', label: 'Extra principal' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`chip chip--sm ${emiClassification === option.value ? 'chip--active' : ''}`}
                  onClick={() => setEmiClassification(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="quick-add__row">
          <div className="quick-add__amount-wrapper">
            <span className="quick-add__rupee">₹</span>
            <input
              ref={amountRef}
              type="number"
              className="quick-add__amount"
              aria-label="Payment amount"
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
        {hasMatchingPayment && (
          <p className="quick-add__duplicate-warning">
            A payment with this amount and date already exists. Save again only if it was a separate transfer.
          </p>
        )}
        {wordsText && <p className="quick-add__words">{wordsText}</p>}
        {emiPreview && numericAmount > 0 && (
          <p className={`quick-add__classification quick-add__classification--${emiPreview.classification}`}>
            This entry: {formatCurrency(emiPreview.regularAmount)} normal EMI
            {emiPreview.extraAmount > 0 && <> + <strong>{formatCurrency(emiPreview.extraAmount)} extra principal</strong></>}
          </p>
        )}

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
