import { useState } from 'react'
import '../style/Login.css'
import { signInWithPopup } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api } from '../../utils/axios'
import { auth, googleProvider } from '../../utils/firebase'

function Login({ setUser }) {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleLogin = async (token) => {
    try {
      const { data } = await api.post('/auth/login', { token })
      toast.success(
        <div className="login-success-toast">
          <strong>User login successfully</strong>
          <span>Welcome back, {data.user?.name?.split(/\s+/)[0] || 'your workspace'}.</span>
        </div>,
      )
      setUser(data.user)
      navigate('/home')
    } catch (error) {
      console.error('Error during login:', error)
      setErrorMessage('Unable to sign in right now. Please try again.')
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage('')
    setIsSigningIn(true)

    try {
      const result = await signInWithPopup(auth, googleProvider)
      const token = await result.user.getIdToken()
      await handleLogin(token)
    } catch (error) {
      console.error('Error during Google sign-in:', error)
      setErrorMessage('Google sign-in failed. Please try again.')
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="Sign in to MultiTask AI">
        <aside className="welcome-panel">
          <div className="brand" aria-label="MultiTask AI">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span>MultiTask<span className="brand-accent">Ai</span></span>
          </div>

          <div className="welcome-copy">
            <p className="eyebrow">YOUR AI WORKSPACE</p>
            <h1>Think bigger.<br />Get more done.</h1>
            <p className="welcome-description">
              A thoughtful space to explore ideas, make plans, and bring your best work to life.
            </p>
          </div>

          <div className="workspace-preview" aria-hidden="true">
            <div className="preview-topbar">
              <span className="preview-assistant-mark">
                <span />
                <span />
                <span />
                <span />
              </span>
              <span>Multitask assistant</span>
              <span className="preview-status"><i /> Ready</span>
            </div>
            <div className="preview-question">
              <span className="preview-user-mark">S</span>
              <span>Help me turn an idea into a plan...</span>
            </div>
            <div className="preview-answer">
              <span className="preview-answer-mark">✦</span>
              <div>
                <span className="preview-answer-label">A GOOD PLACE TO START</span>
                <span className="preview-answer-line preview-answer-line-long" />
                <span className="preview-answer-line" />
                <span className="preview-answer-line preview-answer-line-short" />
              </div>
            </div>
            <div className="preview-glow" />
          </div>

          <div className="welcome-footer">
            <span className="welcome-footer-icon" aria-hidden="true">✧</span>
            <p>One calm space for everything you do.</p>
          </div>
          <div className="panel-orb panel-orb-one" aria-hidden="true" />
          <div className="panel-orb panel-orb-two" aria-hidden="true" />
        </aside>

        <section className="sign-in-panel">
          <div className="mobile-brand">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span>multitask<span className="brand-accent">ai</span></span>
          </div>

          <div className="sign-in-content">
            <div className="sign-in-heading">
              <p className="eyebrow">WELCOME BACK</p>
              <h2>Your next great idea<br />starts here.</h2>
              <p>Sign in to continue to your workspace.</p>
            </div>

            <button
              className="google-button"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
            >
              <svg className="google-icon" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.61 17.74 9.5 24 9.5Z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.87c-.58 2.96-2.26 5.48-4.73 7.18l7.63 5.92c4.45-4.1 7.21-10.14 7.21-17.57Z" />
                <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.88l-7.63-5.92c-2.12 1.42-4.84 2.26-8.27 2.26-6.26 0-11.57-4.11-13.47-9.71l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
              </svg>
              <span>{isSigningIn ? 'Signing in…' : 'Continue with Google'}</span>
              <span className="button-arrow" aria-hidden="true">→</span>
            </button>

            {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}

            <div className="sign-in-divider" aria-hidden="true">
              <span />
              <span>FAST · SECURE · SIMPLE</span>
              <span />
            </div>

            <p className="terms-copy">
              By continuing, you agree to our <a href="#">Terms of Service</a> and{' '}
              <a href="#">Privacy Policy</a>.
            </p>
          </div>

          <footer className="sign-in-footer">
            <span>© 2026 MultiTask AI</span>
            <a href="#">Need help?</a>
          </footer>
        </section>
      </section>
    </main>
  )
}

export default Login
