import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Application error captured by boundary:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__card">
            <h1>Something went wrong</h1>
            <p>We hit an unexpected error while loading your expenses. You can reload the page or return to the dashboard.</p>
            <div className="error-boundary__actions">
              <button type="button" className="btn btn-ghost" onClick={this.handleRetry}>
                Try Again
              </button>
              <button type="button" className="btn btn-primary" onClick={this.handleReload}>
                Reload App
              </button>
            </div>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="error-boundary__details">{this.state.error?.message}</pre>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
