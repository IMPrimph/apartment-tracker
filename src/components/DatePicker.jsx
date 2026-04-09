import { useState, useRef, useEffect } from 'react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const formatDisplay = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const toDateStr = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Parse current value for calendar view
  const selected = value ? new Date(value + 'T00:00:00') : new Date()
  const [viewYear, setViewYear] = useState(selected.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected.getMonth())

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  // Convert Sunday=0 to Monday-based (Mo=0, Su=6)
  const startOffset = (firstDayOfMonth + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const selectDate = (day) => {
    onChange(toDateStr(viewYear, viewMonth, day))
    setOpen(false)
  }

  const goToday = () => {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    onChange(toDateStr(now.getFullYear(), now.getMonth(), now.getDate()))
    setOpen(false)
  }

  const selectedDay = selected.getFullYear() === viewYear && selected.getMonth() === viewMonth
    ? selected.getDate()
    : null

  const today = new Date()
  const isToday = (day) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day

  // Build calendar grid cells
  const cells = []
  // Previous month trailing days
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, type: 'outside' })
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: 'current' })
  }
  // Next month leading days to fill grid
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, type: 'outside' })
    }
  }

  return (
    <div className="datepicker" ref={ref}>
      <button
        type="button"
        className="datepicker__trigger"
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="datepicker__value">{formatDisplay(value)}</span>
        <svg className="datepicker__icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div className="datepicker__dropdown" role="dialog" aria-label="Choose date">
          <div className="datepicker__nav">
            <button type="button" className="datepicker__nav-btn" onClick={prevMonth} aria-label="Previous month">
              ‹
            </button>
            <span className="datepicker__nav-label">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" className="datepicker__nav-btn" onClick={nextMonth} aria-label="Next month">
              ›
            </button>
          </div>

          <div className="datepicker__grid">
            {DAYS.map(d => (
              <div key={d} className="datepicker__day-header">{d}</div>
            ))}
            {cells.map((cell, i) => (
              <button
                key={i}
                type="button"
                className={
                  'datepicker__cell' +
                  (cell.type === 'outside' ? ' datepicker__cell--outside' : '') +
                  (cell.type === 'current' && cell.day === selectedDay ? ' datepicker__cell--selected' : '') +
                  (cell.type === 'current' && isToday(cell.day) && cell.day !== selectedDay ? ' datepicker__cell--today' : '')
                }
                onClick={() => cell.type === 'current' && selectDate(cell.day)}
                disabled={cell.type === 'outside'}
                tabIndex={cell.type === 'outside' ? -1 : 0}
              >
                {cell.day}
              </button>
            ))}
          </div>

          <div className="datepicker__footer">
            <button type="button" className="datepicker__footer-btn" onClick={() => setOpen(false)}>
              Close
            </button>
            <button type="button" className="datepicker__footer-btn datepicker__footer-btn--accent" onClick={goToday}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
