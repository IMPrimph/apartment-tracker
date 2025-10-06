import { useEffect, useState } from 'react'

const STORAGE_KEY = 'apartment_tracker_auth'

const hashPassword = async (password) => {
  if (!password) return ''

  if (!window.crypto || !window.crypto.subtle) {
    return password
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function AuthGate({ children }) {
  const [status, setStatus] = useState('loading')
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [hashedSecret, setHashedSecret] = useState('')

  useEffect(() => {
    const secret = import.meta.env.VITE_APP_PASSWORD
    if (!secret) {
      console.warn('VITE_APP_PASSWORD not set. Rendering without password gate.')
      setStatus('authorized')
      return
    }

    let cancelled = false

    const initialise = async () => {
      const hash = await hashPassword(secret)
      if (cancelled) return

      setHashedSecret(hash)
      const storedToken = localStorage.getItem(STORAGE_KEY)

      if (storedToken && storedToken === hash) {
        setStatus('authorized')
      } else {
        setStatus('prompt')
      }
    }

    initialise()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!hashedSecret) return

    const hashedInput = await hashPassword(input)

    if (hashedInput === hashedSecret) {
      localStorage.setItem(STORAGE_KEY, hashedSecret)
      setStatus('authorized')
      setInput('')
      setError('')
    } else {
      setError('Incorrect password. Try again.')
      setInput('')
    }
  }

  if (status === 'authorized') {
    return children
  }

  if (status === 'loading') {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <p>Preparing secure access…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Private Access</h1>
        <p className="auth-subtitle">Enter your passphrase to open the apartment cost tracker.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="password"
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              setError('')
            }}
            placeholder="Password"
            required
            autoFocus
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary auth-submit">Unlock</button>
        </form>
      </div>
    </div>
  )
}

export default AuthGate
