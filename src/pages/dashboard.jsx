import { useState, useEffect, useRef } from 'preact/hooks'
import { supabase } from '../lib/supabase.js'
import { formatDateTime, calculateBMI, getUserHeight } from '../lib/utils.js'
import Chart from 'chart.js/auto'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    async function load() {
      const [weightRes, exerciseRes, medicineRes, sleepRes, height] = await Promise.all([
        supabase.from('weight_log').select('*').gte('recorded_at', new Date(Date.now() - 180 * 86400000).toISOString()).order('recorded_at', { ascending: false }),
        supabase.from('exercise_log').select('*, exercise_types(name)').gte('recorded_at', new Date(Date.now() - 180 * 86400000).toISOString()).order('recorded_at', { ascending: false }).limit(10),
        supabase.from('medicine_log').select('*, medications(brand_name)').gte('recorded_at', new Date(Date.now() - 180 * 86400000).toISOString()).order('recorded_at', { ascending: false }).limit(5),
        supabase.from('sleep_log').select('*').order('bedtime', { ascending: false }).limit(1),
        getUserHeight(),
      ])
      setData({
        weights: weightRes.data || [],
        exercises: exerciseRes.data || [],
        medicines: medicineRes.data || [],
        latestSleep: (sleepRes.data || [])[0],
        height,
      })
    }
    load()
  }, [])

  useEffect(() => {
    if (!data || !chartRef.current) return
    if (chartInstance.current) chartInstance.current.destroy()
    const sorted = [...data.weights].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    if (sorted.length === 0) return

    chartInstance.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: sorted.map(w => new Date(w.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Weight (lbs)',
          data: sorted.map(w => w.weight_lbs),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true, tension: 0.3, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 11 } } }
        }
      }
    })
    return () => { if (chartInstance.current) chartInstance.current.destroy() }
  }, [data])

  if (!data) return <div class="loading">Loading...</div>

  const { weights, exercises, medicines, latestSleep, height } = data
  const latestWeight = weights[0]
  const bmi = latestWeight ? calculateBMI(latestWeight.weight_lbs, height) : '--'

  let sleepDuration = '--'
  if (latestSleep) {
    const mins = (new Date(latestSleep.wake_time) - new Date(latestSleep.bedtime)) / 60000
    sleepDuration = `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div class="page">
      <div class="page-header"><h1>Dashboard</h1></div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Weight</div>
          <div class="stat-value">{latestWeight ? latestWeight.weight_lbs : '--'}<span style="font-size:14px;font-weight:400"> lbs</span></div>
          <div class="stat-sub">BMI {bmi}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Last Sleep</div>
          <div class="stat-value">{sleepDuration}</div>
          <div class="stat-sub">{latestSleep ? '\u2733'.repeat(latestSleep.quality || 0) : 'No data'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Exercises</div>
          <div class="stat-value">{exercises.length}</div>
          <div class="stat-sub">Recent entries</div>
        </div>
      </div>

      <div class="card">
        <h2>Weight Trend</h2>
        <div class="chart-container"><canvas ref={chartRef} /></div>
      </div>

      <div class="two-col">
        <div class="card">
          <h2>Recent Exercises</h2>
          {exercises.length === 0 ? <p class="empty">No exercises yet</p> : (
            <table>
              <thead><tr><th>Date</th><th>Exercise</th><th>Total</th></tr></thead>
              <tbody>
                {exercises.map(e => (
                  <tr key={e.id}>
                    <td>{formatDateTime(e.recorded_at)}</td>
                    <td>{e.exercise_types?.name || '?'}</td>
                    <td>{e.sets}x{e.reps} {e.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div class="card">
          <h2>Recent Medications</h2>
          {medicines.length === 0 ? <p class="empty">No meds logged</p> : (
            <table>
              <thead><tr><th>Date</th><th>Med</th><th>Qty</th></tr></thead>
              <tbody>
                {medicines.map(m => (
                  <tr key={m.id}>
                    <td>{formatDateTime(m.recorded_at)}</td>
                    <td>{m.medications?.brand_name || '?'}</td>
                    <td>{m.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style="text-align:center;padding:24px 0 8px">
        <button class="btn btn-secondary btn-sm" onClick={handleSignOut}>Sign Out</button>
      </div>
    </div>
  )
}
