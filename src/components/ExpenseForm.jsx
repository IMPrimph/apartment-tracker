import { useState, useEffect } from 'react'

function ExpenseForm({ expense, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    type: 'miscellaneous',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [displayAmount, setDisplayAmount] = useState('')
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (expense) {
      setFormData({
        type: expense.type || 'miscellaneous',
        amount: expense.amount || '',
        description: expense.description || '',
        date: expense.date || new Date().toISOString().split('T')[0]
      })
      formatAmount(expense.amount || '')
    } else {
      setFormData(prev => ({ ...prev, amount: '', description: '' }))
      setDisplayAmount('')
    }
  }, [expense])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'amount') {
      formatAmount(value)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Please enter a description'
    }
    
    if (!formData.date) {
      newErrors.date = 'Please select a date'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const parsedAmount = parseFloat(formData.amount)
      await onSubmit({
        ...formData,
        amount: Number.isNaN(parsedAmount) ? formData.amount : parsedAmount
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatAmount = (value) => {
    if (!value) {
      setDisplayAmount('')
      return
    }

    const numericValue = Number(value)

    if (Number.isNaN(numericValue)) {
      setDisplayAmount('')
      return
    }

    const formatter = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: value.includes('.') ? 2 : 0
    })

    const formatted = formatter.format(numericValue)
    setDisplayAmount(`${formatted} (${convertToWords(numericValue)})`)
  }

  const convertToWords = (num) => {
    if (!Number.isFinite(num)) return ''
    const belowTwenty = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    const toWordsBelowHundred = (n) => {
      if (n < 20) return belowTwenty[n]
      const ten = Math.floor(n / 10)
      const unit = n % 10
      return unit ? `${tens[ten]} ${belowTwenty[unit]}` : tens[ten]
    }

    const toWordsBelowThousand = (n) => {
      const hundred = Math.floor(n / 100)
      const rest = n % 100
      const parts = []

      if (hundred) {
        parts.push(`${belowTwenty[hundred]} Hundred`)
      }

      if (rest) {
        parts.push(toWordsBelowHundred(rest))
      }

      return parts.join(' ')
    }

    if (num === 0) return 'Zero Rupees'

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

    if (decimalPart) {
      words += ` and ${toWordsBelowHundred(decimalPart)} Paise`
    }

    if (isNegative) {
      words = `Minus ${words}`
    }

    return words
  }

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{expense ? 'Edit Expense' : 'Add New Expense'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="miscellaneous">Miscellaneous Costs</option>
              <option value="bankLoan">Bank Loan Payment</option>
              <option value="cash">Cash Payment</option>
              <option value="emi">EMI Payment</option>
            </select>
          </div>

          <div className="form-group">
            <label>Amount (₹) *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Enter amount"
              required
              className={errors.amount ? 'form-input--error' : ''}
            />
            {errors.amount && (
              <p className="form-error">{errors.amount}</p>
            )}
            {displayAmount && (
              <p className="form-helper">{displayAmount}</p>
            )}
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description"
              rows="3"
              required
              className={errors.description ? 'form-input--error' : ''}
            />
            {errors.description && (
              <p className="form-error">{errors.description}</p>
            )}
          </div>

          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className={errors.date ? 'form-input--error' : ''}
            />
            {errors.date && (
              <p className="form-error">{errors.date}</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCancel} className="btn btn-ghost">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ExpenseForm
