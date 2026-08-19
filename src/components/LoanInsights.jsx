import { useEffect, useMemo, useState } from 'react'
import { formatCurrency } from '../utils/formatCurrency'
import { formatTenure, normalizeLoanSettings } from '../utils/loanCalculations'

const formatMonth = (month) => {
  const [year, monthNumber] = month.split('-')
  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric'
  })
}

const moneyInput = (value, onChange, id) => (
  <div className="loan-settings__money">
    <span>₹</span>
    <input id={id} type="number" min="0" step="1" value={value} onChange={onChange} />
  </div>
)

function LoanInsights({ insights, settings, onSaveSettings, savingSettings }) {
  const [showSettings, setShowSettings] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showAllMonths, setShowAllMonths] = useState(false)
  const [draft, setDraft] = useState(() => normalizeLoanSettings(settings))
  const [settingsError, setSettingsError] = useState('')

  useEffect(() => {
    setDraft(normalizeLoanSettings(settings))
  }, [settings])

  const visibleMonths = useMemo(() => (
    showAllMonths ? insights.monthlyBreakdown : insights.monthlyBreakdown.slice(0, 8)
  ), [insights.monthlyBreakdown, showAllMonths])

  const updateDraft = (field, value) => {
    setDraft(previous => ({ ...previous, [field]: value }))
    setSettingsError('')
  }

  const updateRate = (index, field, value) => {
    setDraft(previous => ({
      ...previous,
      rateChanges: previous.rateChanges.map((change, changeIndex) => (
        changeIndex === index ? { ...change, [field]: value } : change
      ))
    }))
    setSettingsError('')
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    const normalized = normalizeLoanSettings(draft)
    if (normalized.rateChanges.length === 0) {
      setSettingsError('Add at least one interest-rate period.')
      return
    }
    if (normalized.balanceSnapshot <= 0 || normalized.normalEmi <= 0) {
      setSettingsError('Balance and normal EMI must be greater than zero.')
      return
    }
    await onSaveSettings(normalized)
    setShowSettings(false)
  }

  return (
    <section className="loan-insights">
      <header className="loan-insights__header">
        <div>
          <span className="loan-insights__eyebrow">Home loan impact</span>
          <h2>Your loan progress</h2>
          <p>
            Based on {insights.paymentCount} recorded EMI payments at the current {insights.currentRate}% rate.
          </p>
        </div>
        <button type="button" className="loan-insights__settings-button" onClick={() => setShowSettings(value => !value)}>
          {showSettings ? 'Close settings' : 'Loan settings'}
        </button>
      </header>

      {showSettings && (
        <form className="loan-settings" onSubmit={saveSettings}>
          <div className="loan-settings__grid">
            <label>
              <span>Normal monthly EMI</span>
              {moneyInput(draft.normalEmi, event => updateDraft('normalEmi', event.target.value), 'normal-emi')}
            </label>
            <label>
              <span>Bank contractual EMI</span>
              {moneyInput(draft.bankEmi, event => updateDraft('bankEmi', event.target.value), 'bank-emi')}
            </label>
            <label>
              <span>Known outstanding balance</span>
              {moneyInput(draft.balanceSnapshot, event => updateDraft('balanceSnapshot', event.target.value), 'balance-snapshot')}
            </label>
            <label>
              <span>Balance is after payments through</span>
              <input type="date" value={draft.balanceSnapshotDate} onChange={event => updateDraft('balanceSnapshotDate', event.target.value)} />
            </label>
            <label>
              <span>First regular EMI month</span>
              <input type="month" value={draft.firstEmiMonth} onChange={event => updateDraft('firstEmiMonth', event.target.value)} />
            </label>
            <label>
              <span>Original tenure</span>
              <div className="loan-settings__suffix">
                <input type="number" min="1" value={draft.originalTenureMonths} onChange={event => updateDraft('originalTenureMonths', event.target.value)} />
                <span>months</span>
              </div>
            </label>
          </div>

          <div className="loan-settings__rates">
            <div className="loan-settings__rates-header">
              <div>
                <strong>Floating-rate history</strong>
                <span>Each rate applies from its date until the next change.</span>
              </div>
              <button
                type="button"
                onClick={() => setDraft(previous => ({
                  ...previous,
                  rateChanges: [...previous.rateChanges, { date: insights.asOfDate, annualRate: insights.currentRate }]
                }))}
              >
                Add rate
              </button>
            </div>
            {draft.rateChanges.map((change, index) => (
              <div className="loan-settings__rate-row" key={`${change.date}-${index}`}>
                <input aria-label={`Rate ${index + 1} effective date`} type="date" value={change.date} onChange={event => updateRate(index, 'date', event.target.value)} />
                <div className="loan-settings__suffix">
                  <input aria-label={`Rate ${index + 1} annual percentage`} type="number" min="0" max="30" step="0.01" value={change.annualRate} onChange={event => updateRate(index, 'annualRate', event.target.value)} />
                  <span>% p.a.</span>
                </div>
                <button
                  type="button"
                  className="loan-settings__remove"
                  aria-label={`Remove rate ${index + 1}`}
                  disabled={draft.rateChanges.length === 1}
                  onClick={() => setDraft(previous => ({
                    ...previous,
                    rateChanges: previous.rateChanges.filter((_, changeIndex) => changeIndex !== index)
                  }))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <p className="loan-settings__note">
            The balance snapshot anchors the lender’s exact accounting. Payments after that date update the estimate automatically.
          </p>
          {settingsError && <p className="loan-settings__error">{settingsError}</p>}
          <button type="submit" className="loan-settings__save" disabled={savingSettings}>
            {savingSettings ? 'Saving…' : 'Save loan settings'}
          </button>
        </form>
      )}

      <div className="loan-insights__metrics">
        <article>
          <span>Estimated balance now</span>
          <strong>{formatCurrency(insights.currentBalance)}</strong>
          <small>From the bank balance snapshot</small>
        </article>
        <article className="loan-insights__metric--green">
          <span>Extra principal paid</span>
          <strong>{formatCurrency(insights.extraPaid)}</strong>
          <small>Above {formatCurrency(insights.settings.normalEmi)} per EMI month</small>
        </article>
        <article className="loan-insights__metric--green">
          <span>Lifetime interest saved</span>
          <strong>{formatCurrency(insights.lifetimeInterestSaved)}</strong>
          <small>{formatCurrency(insights.pastInterestSaved)} already avoided</small>
        </article>
        <article className="loan-insights__metric--blue">
          <span>Tenure saved</span>
          <strong>{formatTenure(insights.tenureSavedMonths)}</strong>
          <small>Due to recorded extra payments</small>
        </article>
      </div>

      <button
        type="button"
        className="loan-insights__details-toggle"
        onClick={() => setShowDetails(value => !value)}
        aria-expanded={showDetails}
      >
        <span>{showDetails ? 'Hide payoff details' : 'View payoff and monthly details'}</span>
        <span className={showDetails ? 'loan-insights__details-chevron loan-insights__details-chevron--open' : 'loan-insights__details-chevron'} aria-hidden="true">⌄</span>
      </button>

      {showDetails && (
        <div className="loan-insights__details">
          {insights.actualPlan && insights.noExtraPlan && (
            <div className="loan-comparison">
              <div className="loan-comparison__row">
                <div>
                  <span>With your actual payments</span>
                  <strong>{formatTenure(insights.actualPlan.months)} remaining</strong>
                </div>
                <span>{formatCurrency(insights.actualPlan.interest)} future interest</span>
              </div>
              <div className="loan-comparison__row loan-comparison__row--muted">
                <div>
                  <span>Without extra payments</span>
                  <strong>{formatTenure(insights.noExtraPlan.months)} remaining</strong>
                </div>
                <span>{formatCurrency(insights.noExtraPlan.interest)} future interest</span>
              </div>
              <p>
                Your {formatCurrency(insights.extraPaid)} of early principal has an estimated {formatCurrency(insights.balanceImpact)} effect on today’s balance.
              </p>
            </div>
          )}

          <div className="loan-breakdown">
            <div className="loan-breakdown__header">
              <div>
                <h3>Month-by-month classification</h3>
                <p>Recomputed automatically whenever an EMI is added, edited, or deleted.</p>
              </div>
              {insights.monthlyBreakdown.length > 8 && (
                <button type="button" onClick={() => setShowAllMonths(value => !value)}>
                  {showAllMonths ? 'Show recent' : 'Show all'}
                </button>
              )}
            </div>
            <div className="loan-breakdown__table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total paid</th>
                    <th>Normal EMI</th>
                    <th>Extra principal</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMonths.map(month => (
                    <tr key={month.month}>
                      <td>{formatMonth(month.month)}</td>
                      <td>{formatCurrency(month.paid)}</td>
                      <td>{formatCurrency(month.regular)}</td>
                      <td className={month.extra > 0 ? 'loan-breakdown__extra' : ''}>{formatCurrency(month.extra)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="loan-insights__disclaimer">
            Savings include recorded EMI entries only. Floating-rate changes, missing payments, lender value dates, and rounding can change the bank’s final figures.
          </p>
        </div>
      )}
    </section>
  )
}

export default LoanInsights
