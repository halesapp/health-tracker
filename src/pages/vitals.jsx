import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { formatDateTime, toLocalDatetimeValue, formatDuration, showToast } from '../lib/utils.js'

export default function Vitals() {
  const [section, setSection] = useState('bp')
  const [bpLogs, setBpLogs] = useState(null)
  const [sleepLogs, setSleepLogs] = useState(null)

  // BP form
  const [bpDt, setBpDt] = useState(toLocalDatetimeValue())
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [bpBusy, setBpBusy] = useState(false)

  // Sleep form
  const [bedtime, setBedtime] = useState(toLocalDatetimeValue())
  const [wakeTime, setWakeTime] = useState(toLocalDatetimeValue())
  const [quality, setQuality] = useState(3)
  const [sleepBusy, setSleepBusy] = useState(false)

  useEffect(() => {
    async function load() {
      const [bpRes, sleepRes] = await Promise.all([
        supabase.from('blood_pressure_log').select('*').order('recorded_at', { ascending: false }),
        supabase.from('sleep_log').select('*').order('bedtime', { ascending: false }),
      ])
      setBpLogs(bpRes.data || [])
      setSleepLogs(sleepRes.data || [])
    }
    load()
  }, [])

  async function handleBpSubmit(e) {
    e.preventDefault()
    setBpBusy(true)
    const row = { recorded_at: bpDt, systolic: parseInt(systolic), diastolic: parseInt(diastolic) }
    if (pulse) row.pulse = parseInt(pulse)
    const { data, error } = await supabase.from('blood_pressure_log').insert(row).select().single()
    setBpBusy(false)
    if (error) return showToast(error.message, 'error')
    showToast('Blood pressure saved')
    setSystolic('')
    setDiastolic('')
    setPulse('')
    setBpLogs([data, ...bpLogs])
  }

  async function handleSleepSubmit(e) {
    e.preventDefault()
    setSleepBusy(true)
    const { data, error } = await supabase.from('sleep_log')
      .insert({ bedtime, wake_time: wakeTime, quality })
      .select().single()
    setSleepBusy(false)
    if (error) return showToast(error.message, 'error')
    showToast('Sleep logged')
    setQuality(3)
    setSleepLogs([data, ...sleepLogs])
  }

  async function handleBpDelete(id) {
    if (!confirm('Delete this entry?')) return
    const { error } = await supabase.from('blood_pressure_log').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setBpLogs(bpLogs.filter(l => l.id !== id))
    showToast('Deleted')
  }

  async function handleSleepDelete(id) {
    if (!confirm('Delete this entry?')) return
    const { error } = await supabase.from('sleep_log').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setSleepLogs(sleepLogs.filter(l => l.id !== id))
    showToast('Deleted')
  }

  if (!bpLogs || !sleepLogs) return <div class="loading">Loading...</div>

  return (
    <div class="page">
      <div class="page-header"><h1>Vitals</h1></div>

      <div class="section-toggle">
        <button class={section === 'bp' ? 'active' : ''} onClick={() => setSection('bp')}>Blood Pressure</button>
        <button class={section === 'sleep' ? 'active' : ''} onClick={() => setSection('sleep')}>Sleep</button>
      </div>

      {section === 'bp' && (
        <>
          <div class="card">
            <h2>Log Blood Pressure</h2>
            <form onSubmit={handleBpSubmit} class="form-stack">
              <div class="form-row">
                <div class="field field-half">
                  <label>Date & Time</label>
                  <input type="datetime-local" value={bpDt} onInput={e => setBpDt(e.target.value)} required />
                </div>
                <div class="field field-half">
                  <label>Systolic</label>
                  <input type="number" inputmode="numeric" placeholder="120" value={systolic} onInput={e => setSystolic(e.target.value)} required />
                </div>
              </div>
              <div class="form-row">
                <div class="field field-half">
                  <label>Diastolic</label>
                  <input type="number" inputmode="numeric" placeholder="80" value={diastolic} onInput={e => setDiastolic(e.target.value)} required />
                </div>
                <div class="field field-half">
                  <label>Pulse (optional)</label>
                  <input type="number" inputmode="numeric" placeholder="72" value={pulse} onInput={e => setPulse(e.target.value)} />
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-block" disabled={bpBusy}>Save</button>
            </form>
          </div>

          <div class="card">
            <h2>History</h2>
            <div class="table-scroll">
              <table>
                <thead><tr><th>Date</th><th>Sys/Dia</th><th>Pulse</th><th></th></tr></thead>
                <tbody>
                  {bpLogs.map(l => (
                    <tr key={l.id}>
                      <td>{formatDateTime(l.recorded_at)}</td>
                      <td>{l.systolic}/{l.diastolic}</td>
                      <td>{l.pulse || '--'}</td>
                      <td class="td-actions">
                        <button class="btn-icon" title="Delete" onClick={() => handleBpDelete(l.id)}>{'\uD83D\uDDD1'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {bpLogs.length === 0 && <p class="empty">No blood pressure entries</p>}
          </div>
        </>
      )}

      {section === 'sleep' && (
        <>
          <div class="card">
            <h2>Log Sleep</h2>
            <form onSubmit={handleSleepSubmit} class="form-stack">
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
              <button type="submit" class="btn btn-primary btn-block" disabled={sleepBusy}>Save</button>
            </form>
          </div>

          <div class="card">
            <h2>History</h2>
            <div class="table-scroll">
              <table>
                <thead><tr><th>Bedtime</th><th>Wake</th><th>Duration</th><th>Quality</th><th></th></tr></thead>
                <tbody>
                  {sleepLogs.map(l => {
                    const mins = (new Date(l.wake_time) - new Date(l.bedtime)) / 60000
                    const dur = `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`
                    return (
                      <tr key={l.id}>
                        <td>{formatDateTime(l.bedtime)}</td>
                        <td>{formatDateTime(l.wake_time)}</td>
                        <td>{dur}</td>
                        <td>{'\u2733'.repeat(l.quality || 0)}</td>
                        <td class="td-actions">
                          <button class="btn-icon" title="Delete" onClick={() => handleSleepDelete(l.id)}>{'\uD83D\uDDD1'}</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {sleepLogs.length === 0 && <p class="empty">No sleep entries</p>}
          </div>
        </>
      )}
    </div>
  )
}
