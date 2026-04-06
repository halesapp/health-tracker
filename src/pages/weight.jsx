import { useState, useEffect, useRef } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { formatDateTimeFull, toLocalDatetimeValue, toDatetimeLocalValue, calculateBMI, getUserHeight, showToast } from '../lib/utils.js'
import Chart from 'chart.js/auto'

export default function Weight() {
  const [weights, setWeights] = useState(null)
  const [height, setHeight] = useState(65)
  const [dt, setDt] = useState(toLocalDatetimeValue())
  const [lbs, setLbs] = useState('')
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editDt, setEditDt] = useState('')
  const [editLbs, setEditLbs] = useState('')
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    async function load() {
      const [res, h] = await Promise.all([
        supabase.from('health_weight_log').select('*')
          .gte('recorded_at', new Date(Date.now() - 180 * 86400000).toISOString())
          .order('recorded_at', { ascending: false }),
        getUserHeight(),
      ])
      setWeights(res.data || [])
      setHeight(h)
    }
    load()
  }, [])

  useEffect(() => {
    if (!weights || !chartRef.current) return
    if (chartInstance.current) chartInstance.current.destroy()
    const sorted = [...weights].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    if (sorted.length === 0) return
    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: sorted.map(w => new Date(w.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit', timeZone: 'UTC' })),
        datasets: [{
          label: 'Weight (lbs)', data: sorted.map(w => w.weight_lbs),
          borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true, tension: 0.3, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false }, ticks: { maxTicksLimit: 10, font: { size: 11 } } }
        }
      }
    })
    return () => { if (chartInstance.current) chartInstance.current.destroy() }
  }, [weights])

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    const { data, error } = await supabase.from('health_weight_log')
      .insert({ recorded_at: dt, weight_lbs: parseFloat(lbs) })
      .select().single()
    setBusy(false)
    if (error) return showToast(error.message, 'error')
    showToast('Weight saved')
    setLbs('')
    setWeights([data, ...weights])
  }

  function startEdit(w) {
    setEditId(w.id)
    setEditDt(toDatetimeLocalValue(w.recorded_at))
    setEditLbs(String(w.weight_lbs))
  }

  function cancelEdit() {
    setEditId(null)
  }

  async function saveEdit(id) {
    const { data, error } = await supabase.from('health_weight_log')
      .update({ recorded_at: editDt, weight_lbs: parseFloat(editLbs) })
      .eq('id', id)
      .select().single()
    if (error) return showToast(error.message, 'error')
    setWeights(weights.map(w => w.id === id ? data : w))
    setEditId(null)
    showToast('Updated')
  }

  async function handleDelete(id) {
    if (!confirm('Delete this entry?')) return
    const { error } = await supabase.from('health_weight_log').delete().eq('id', id)
    if (error) return showToast(error.message, 'error')
    setWeights(weights.filter(w => w.id !== id))
    showToast('Deleted')
  }

  if (!weights) return <div class="loading">Loading...</div>

  return (
    <div class="page">
      <div class="page-header"><h1>Weight</h1></div>

      <div class="card">
        <h2>Log Weight</h2>
        <form onSubmit={handleSubmit} class="form-stack">
          <div class="form-row">
            <div class="field field-half">
              <label>Date & Time</label>
              <input type="datetime-local" value={dt} onInput={e => setDt(e.target.value)} required />
            </div>
            <div class="field field-half">
              <label>Weight (lbs)</label>
              <input type="number" step="0.1" inputmode="decimal" placeholder="150.0" value={lbs} onInput={e => setLbs(e.target.value)} required />
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block" disabled={busy}>Save</button>
        </form>
      </div>

      <div class="card">
        <h2>Trend</h2>
        <div class="chart-container"><canvas ref={chartRef} /></div>
      </div>

      <div class="card">
        <h2>History</h2>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Date</th><th>lbs</th><th>BMI</th><th></th></tr></thead>
            <tbody>
              {weights.map(w => editId === w.id ? (
                <tr key={w.id}>
                  <td><input type="datetime-local" class="edit-input" value={editDt} onInput={e => setEditDt(e.target.value)} /></td>
                  <td><input type="number" step="0.1" class="edit-input edit-input-sm" value={editLbs} onInput={e => setEditLbs(e.target.value)} /></td>
                  <td>{calculateBMI(editLbs || 0, height)}</td>
                  <td class="td-actions">
                    <button class="btn-icon" title="Save" onClick={() => saveEdit(w.id)}>{'\u2714'}</button>
                    <button class="btn-icon" title="Cancel" onClick={cancelEdit}>{'\u2716'}</button>
                  </td>
                </tr>
              ) : (
                <tr key={w.id}>
                  <td>{formatDateTimeFull(w.recorded_at)}</td>
                  <td>{w.weight_lbs}</td>
                  <td>{calculateBMI(w.weight_lbs, height)}</td>
                  <td class="td-actions">
                    <button class="btn-icon" title="Edit" onClick={() => startEdit(w)}>{'\u270E'}</button>
                    <button class="btn-icon" title="Delete" onClick={() => handleDelete(w.id)}>{'\uD83D\uDDD1'}</button>
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
