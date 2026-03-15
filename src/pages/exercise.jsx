import { useState, useEffect } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { formatDateTime, toLocalDatetimeValue, showToast } from '../lib/utils.js'

export default function Exercise() {
  const [types, setTypes] = useState([])
  const [exercises, setExercises] = useState(null)
  const [dt, setDt] = useState(toLocalDatetimeValue())
  const [typeId, setTypeId] = useState('')
  const [sets, setSets] = useState('1')
  const [reps, setReps] = useState('')
  const [unit, setUnit] = useState('reps')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      const [tRes, lRes] = await Promise.all([
        supabase.from('exercise_types').select('*').order('name'),
        supabase.from('exercise_log').select('*, exercise_types(name, default_unit)').order('recorded_at', { ascending: false }),
      ])
      setTypes(tRes.data || [])
      setExercises(lRes.data || [])
    }
    load()
  }, [])

  function handleTypeChange(e) {
    setTypeId(e.target.value)
    const opt = e.target.selectedOptions[0]
    if (opt?.dataset.unit) setUnit(opt.dataset.unit)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    const { data, error } = await supabase.from('exercise_log')
      .insert({ recorded_at: dt, exercise_type_id: parseInt(typeId), sets: parseInt(sets), reps: parseInt(reps), unit })
      .select('*, exercise_types(name, default_unit)').single()
    setBusy(false)
    if (error) return showToast(error.message, 'error')
    showToast('Exercise logged')
    setSets('1')
    setReps('')
    setExercises([data, ...exercises])
  }

  async function handleDelete(id) {
    if (!confirm('Delete?')) return
    const { error } = await supabase.from('exercise_log').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setExercises(exercises.filter(e => e.id !== id))
    showToast('Deleted')
  }

  if (!exercises) return <div class="loading">Loading...</div>

  // Group by date
  const byDate = {}
  for (const e of exercises) {
    const key = new Date(e.recorded_at).toLocaleDateString()
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(e)
  }

  return (
    <div class="page">
      <div class="page-header"><h1>Exercise</h1></div>

      <div class="card">
        <h2>Log Exercise</h2>
        <form onSubmit={handleSubmit} class="form-stack">
          <div class="form-row">
            <div class="field field-half">
              <label>Date & Time</label>
              <input type="datetime-local" value={dt} onInput={e => setDt(e.target.value)} required />
            </div>
            <div class="field field-half">
              <label>Exercise</label>
              <select value={typeId} onChange={handleTypeChange} required>
                <option value="">Select...</option>
                {types.map(t => <option key={t.id} value={t.id} data-unit={t.default_unit}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field field-half">
              <label>Sets</label>
              <input type="number" inputmode="numeric" min="1" value={sets} onInput={e => setSets(e.target.value)} required />
            </div>
            <div class="field field-half">
              <label>Reps</label>
              <input type="number" inputmode="numeric" min="1" placeholder="10" value={reps} onInput={e => setReps(e.target.value)} required />
            </div>
          </div>
          <div class="form-row">
            <div class="field field-half">
              <label>Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}>
                <option value="reps">reps</option>
                <option value="seconds">seconds</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block" disabled={busy}>Save</button>
        </form>
      </div>

      <div class="card">
        <h2>By Day</h2>
        {Object.keys(byDate).length === 0 ? <p class="empty">No exercises yet</p> : (
          <div class="exercise-days">
            {Object.entries(byDate).map(([date, entries]) => (
              <div class="exercise-day" key={date}>
                <h3>{date}</h3>
                <div class="exercise-chips">
                  {entries.map(e => (
                    <span class="chip" key={e.id}>{e.exercise_types?.name || '?'}: {e.sets}x{e.reps} {e.unit}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div class="card">
        <h2>All Entries</h2>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Date</th><th>Exercise</th><th>Sets</th><th>Reps</th><th>Unit</th><th></th></tr></thead>
            <tbody>
              {exercises.map(e => (
                <tr key={e.id}>
                  <td>{formatDateTime(e.recorded_at)}</td>
                  <td>{e.exercise_types?.name || '?'}</td>
                  <td>{e.sets}</td>
                  <td>{e.reps}</td>
                  <td>{e.unit}</td>
                  <td class="td-actions">
                    <button class="btn-icon" title="Delete" onClick={() => handleDelete(e.id)}>{'\uD83D\uDDD1'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
