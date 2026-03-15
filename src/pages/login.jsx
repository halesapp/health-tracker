import { useState } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { showToast } from '../lib/utils.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      showToast(error.message, 'error')
      setBusy(false)
    }
  }

  return (
    <div class="login-wrapper">
      <div class="login-card">
        <h1>Health Tracker</h1>
        <p class="login-sub">Sign in to access your data</p>
        <form onSubmit={handleSubmit}>
          <div class="field">
            <label for="login-email">Email</label>
            <input
              id="login-email" type="email" autocomplete="email"
              placeholder="you@example.com" required
              value={email} onInput={e => setEmail(e.target.value)}
            />
          </div>
          <div class="field">
            <label for="login-password">Password</label>
            <input
              id="login-password" type="password" autocomplete="current-password"
              placeholder="Password" required
              value={password} onInput={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" class="btn btn-primary login-btn" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
