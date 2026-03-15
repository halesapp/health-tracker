import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { formatDateTime, toLocalDatetimeValue, showToast } from '../lib/utils.js'

export default function Medication() {
  const [meds, setMeds] = useState([])
  const [logs, setLogs] = useState(null)
  const [dt, setDt] = useState(toLocalDatetimeValue())
  const [medId, setMedId] = useState('')
  const [qty, setQty] = useState('1')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      const [medsRes, logRes] = await Promise.all([
        supabase.from('medications').select('*, medication_types(name)').order('drug_name'),
        supabase.from('medicine_log').select('*, medications(drug_name, dose, dose_unit)').order('recorded_at', { ascending: false }),
      ])
      setMeds(medsRes.data || [])
      setLogs(logRes.data || [])
    }
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    const { data, error } = await supabase.from('medicine_log')
      .insert({ recorded_at: dt, medication_id: parseInt(medId), quantity: parseFloat(qty) })
      .select('*, medications(drug_name, dose, dose_unit)').single()
    setBusy(false)
    if (error) return showToast(error.message, 'error')
    showToast('Medication logged')
    setQty('1')
    setLogs([data, ...logs])
  }

  async function handleDelete(id) {
    if (!confirm('Delete this log entry?')) return
    const { error } = await supabase.from('medicine_log').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setLogs(logs.filter(l => l.id !== id))
    showToast('Deleted')
  }

  if (!logs) return <div class="loading">Loading...</div>

  return (
    <div class="page">
      <div class="page-header"><h1>Medication</h1></div>

      <div class="card">
        <h2>Log Medication</h2>
        <form onSubmit={handleSubmit} class="form-stack">
          <div class="form-row">
            <div class="field field-half">
              <label>Date & Time</label>
              <input type="datetime-local" value={dt} onInput={e => setDt(e.target.value)} required />
            </div>
            <div class="field field-half">
              <label>Medication</label>
              <select value={medId} onChange={e => setMedId(e.target.value)} required>
                <option value="">Select...</option>
                {meds.map(m => <option key={m.id} value={m.id}>{m.drug_name} ({m.dose}{m.dose_unit})</option>)}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field field-half">
              <label>Quantity taken</label>
              <input type="number" inputmode="decimal" step="0.5" min="0" value={qty} onInput={e => setQty(e.target.value)} required />
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block" disabled={busy}>Save</button>
        </form>
      </div>

      <div class="card">
        <h2>History</h2>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Date</th><th>Med</th><th>Qty</th><th>Total Dose</th><th></th></tr></thead>
            <tbody>
              {logs.map(l => {
                const totalDose = l.medications ? `${l.quantity * l.medications.dose}${l.medications.dose_unit}` : ''
                return (
                  <tr key={l.id}>
                    <td>{formatDateTime(l.recorded_at)}</td>
                    <td>{l.medications?.drug_name || '?'}</td>
                    <td>{l.quantity}</td>
                    <td>{totalDose}</td>
                    <td class="td-actions">
                      <button class="btn-icon" title="Delete" onClick={() => handleDelete(l.id)}>{'\uD83D\uDDD1'}</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && <p class="empty">No medications logged</p>}
      </div>
    </div>
  )
}
