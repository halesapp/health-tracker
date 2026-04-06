import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import './style.css'
import { supabase } from './lib/supabase.js'
import Nav from './components/nav.jsx'
import Login from './pages/login.jsx'
import Dashboard from './pages/dashboard.jsx'
import Weight from './pages/weight.jsx'
import Medication from './pages/medication.jsx'
import Settings from './pages/settings.jsx'

const pages = { dashboard: Dashboard, weight: Weight, medication: Medication, settings: Settings }

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  function navigate(t) {
    setTab(t)
  }

  if (loading) return <div class="loading">Loading...</div>
  if (!user) return <Login />

  const Page = pages[tab] || Dashboard
  return (
    <>
      <nav id="nav"><Nav active={tab} onNavigate={navigate} /></nav>
      <main id="main"><Page /></main>
    </>
  )
}

render(<App />, document.getElementById('app'))
