import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { formatDateTime, toLocalDatetimeValue, showToast } from '../lib/utils.js'

export default function Sleep() {
  const [logs, setLogs] = useState(null)
  const [bedtime, setBedtime] = useState(toLocalDatetimeValue())
  const [wakeTime, setWakeTime] = useState(toLocalDatetimeValue())
  const [quality, setQuality] = useState(3)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sleep_log').select('*').order('bedtime', { ascending: false })
      setLogs(data || [])
    }
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    const { data, error } = await supabase.from('sleep_log')
      .insert({ bedtime, wake_time: wakeTime, quality })
      .select().single()
    setBusy(false)
    if (error) return showToast(error.message, 'error')
    showToast('Sleep logged')
    setQuality(3)
    setLogs([data, ...logs])
  }

  async function handleDelete(id) {
    if (!confirm('Delete this entry?')) return
    const { error } = await supabase.from('sleep_log').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setLogs(logs.filter(l => l.id !== id))
    showToast('Deleted')
  }

  if (!logs) return <div class="loading">Loading...</div>

  return (
    <div class="page">
      <div class="page-header"><h1>Sleep</h1></div>

      <div class="card">
        <h2>Log Sleep</h2>
        <form onSubmit={handleSubmit} class="form-stack">
          <div class="form-row">
            <div class="field field-half">
              <label>Bedtime</label>
              <input type="datetime-local" value={bedtime} onInput={e => setBedtime(e.target.value)} required />
            </div>
            <div class="field field-half">
              <label>Wake Time</label>
              <input type="datetime-local" value={wakeTime} onInput={e => setWakeTime(e.target.value)} required />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Quality</label>
              <div class="quality-input">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    class={n <= quality ? 'active' : ''}
                    onClick={() => setQuality(n)}
                  >{'\u2733'}</button>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block" disabled={busy}>Save</button>
        </form>
      </div>

      <div class="card">
        <h2>History</h2>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Bedtime</th><th>Wake</th><th>Duration</th><th>Quality</th><th></th></tr></thead>
            <tbody>
              {logs.map(l => {
                const mins = (new Date(l.wake_time) - new Date(l.bedtime)) / 60000
                const dur = `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`
                return (
                  <tr key={l.id}>
                    <td>{formatDateTime(l.bedtime)}</td>
                    <td>{formatDateTime(l.wake_time)}</td>
                    <td>{dur}</td>
                    <td>{'\u2733'.repeat(l.quality || 0)}</td>
                    <td class="td-actions">
                      <button class="btn-icon" title="Delete" onClick={() => handleDelete(l.id)}>{'\uD83D\uDDD1'}</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && <p class="empty">No sleep entries</p>}
      </div>
    </div>
  )
}
