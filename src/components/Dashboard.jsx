import { useMemo } from 'react'
import { APARTMENT_TARGET, BANK_LOAN_CAP } from '../utils/constants'
import { formatCurrency } from '../utils/formatCurrency'

function Dashboard({ expenses, emiPayments, miscExpenses }) {
  const { bankLoan, cash, totalInvested, progress, remaining, bankLoanRemaining, emiTotal, miscTotal } = useMemo(() => {
    const bl = expenses
      .filter(e => e.type === 'bankLoan')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

    const c = expenses
      .filter(e => e.type === 'cash')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

    const total = bl + c

    return {
      bankLoan: bl,
      cash: c,
      totalInvested: total,
      progress: Math.min((total / APARTMENT_TARGET) * 100, 100),
      remaining: Math.max(APARTMENT_TARGET - total, 0),
      bankLoanRemaining: Math.max(BANK_LOAN_CAP - bl, 0),
      emiTotal: emiPayments.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
      miscTotal: miscExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    }
  }, [expenses, emiPayments, miscExpenses])

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
          <article className="stat-card stat-card--blue">
            <span className="stat-card__eyebrow">Bank Loan</span>
            <h3 className="stat-card__value">{formatCurrency(bankLoan)}</h3>
            <span className="stat-card__meta">
              {formatCurrency(bankLoanRemaining)} remaining of {formatCurrency(BANK_LOAN_CAP)}
            </span>
            <div className="stat-card__bar">
              <div className="stat-card__bar-fill stat-card__bar-fill--blue" style={{ width: `${Math.min((bankLoan / BANK_LOAN_CAP) * 100, 100)}%` }} />
            </div>
          </article>
          <article className="stat-card stat-card--green">
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
