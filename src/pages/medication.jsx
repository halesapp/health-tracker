import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { formatDateTime, toLocalDatetimeValue, toDatetimeLocalValue, showToast } from '../lib/utils.js'

export default function Medication() {
  const [meds, setMeds] = useState([])
  const [logs, setLogs] = useState(null)
  const [dt, setDt] = useState(toLocalDatetimeValue())
  const [medId, setMedId] = useState('')
  const [qty, setQty] = useState('1')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editDt, setEditDt] = useState('')
  const [editMedId, setEditMedId] = useState('')
  const [editQty, setEditQty] = useState('')

  useEffect(() => {
    async function load() {
      const [medsRes, logRes] = await Promise.all([
        supabase.from('medications').select('*, medication_types(name), medication_ingredients(active_ingredients(ingredient_name, dose, dose_unit))').order('brand_name'),
        supabase.from('medicine_log').select('*, medications(brand_name, medication_ingredients(active_ingredients(ingredient_name, dose, dose_unit)))').order('recorded_at', { ascending: false }),
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
      .select('*, medications(brand_name, medication_ingredients(active_ingredients(ingredient_name, dose, dose_unit)))').single()
    setBusy(false)
    if (error) return showToast(error.message, 'error')
    showToast('Medication logged')
    setDt(toLocalDatetimeValue())
    setMedId('')
    setQty('1')
    setLogs([data, ...logs])
  }

  function startEdit(l) {
    setEditId(l.id)
    setEditDt(toDatetimeLocalValue(l.recorded_at))
    setEditMedId(String(l.medication_id))
    setEditQty(String(l.quantity))
  }

  function cancelEdit() {
    setEditId(null)
  }

  async function saveEdit(id) {
    const { data, error } = await supabase.from('medicine_log')
      .update({ recorded_at: editDt, medication_id: parseInt(editMedId), quantity: parseFloat(editQty) })
      .eq('id', id)
      .select('*, medications(brand_name, medication_ingredients(active_ingredients(ingredient_name, dose, dose_unit)))').single()
    if (error) return showToast(error.message, 'error')
    setLogs(logs.map(l => l.id === id ? data : l))
    setEditId(null)
    showToast('Updated')
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
                {meds.map(m => {
                  const ingredients = (m.medication_ingredients || []).map(i => i.active_ingredients).filter(Boolean).map(a => `${a.ingredient_name} ${a.dose}${a.dose_unit}`).join(' + ')
                  return <option key={m.id} value={m.id}>{m.brand_name}{ingredients ? ` (${ingredients})` : ''}</option>
                })}
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
                if (editId === l.id) {
                  const editMed = meds.find(m => m.id === parseInt(editMedId))
                  const editIngs = (editMed?.medication_ingredients || []).map(i => i.active_ingredients).filter(Boolean)
                  const editTotalDose = editIngs.map(a => `${(parseFloat(editQty) || 0) * a.dose}${a.dose_unit} ${a.ingredient_name}`).join(' + ')
                  return (
                    <tr key={l.id}>
                      <td><input type="datetime-local" class="edit-input" value={editDt} onInput={e => setEditDt(e.target.value)} /></td>
                      <td>
                        <select class="edit-input" value={editMedId} onChange={e => setEditMedId(e.target.value)}>
                          {meds.map(m => <option key={m.id} value={m.id}>{m.brand_name}</option>)}
                        </select>
                      </td>
                      <td><input type="number" step="0.5" class="edit-input edit-input-sm" value={editQty} onInput={e => setEditQty(e.target.value)} /></td>
                      <td>{editTotalDose}</td>
                      <td class="td-actions">
                        <button class="btn-icon" title="Save" onClick={() => saveEdit(l.id)}>{'\u2714'}</button>
                        <button class="btn-icon" title="Cancel" onClick={cancelEdit}>{'\u2716'}</button>
                      </td>
                    </tr>
                  )
                }
                const ings = (l.medications?.medication_ingredients || []).map(i => i.active_ingredients).filter(Boolean)
                const totalDose = ings.map(a => `${l.quantity * a.dose}${a.dose_unit} ${a.ingredient_name}`).join(' + ')
                return (
                  <tr key={l.id}>
                    <td>{formatDateTime(l.recorded_at)}</td>
                    <td>{l.medications?.brand_name || '?'}</td>
                    <td>{l.quantity}</td>
                    <td>{totalDose}</td>
                    <td class="td-actions">
                      <button class="btn-icon" title="Edit" onClick={() => startEdit(l)}>{'\u270E'}</button>
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
