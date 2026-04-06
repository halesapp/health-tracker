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
      const [weightRes, medicineRes, height] = await Promise.all([
        supabase.from('health_weight_log').select('*').gte('recorded_at', new Date(Date.now() - 180 * 86400000).toISOString()).order('recorded_at', { ascending: false }),
        supabase.from('health_medicine_log').select('*, health_medications(brand_name)').gte('recorded_at', new Date(Date.now() - 180 * 86400000).toISOString()).order('recorded_at', { ascending: false }).limit(5),
        getUserHeight(),
      ])
      setData({
        weights: weightRes.data || [],
        medicines: medicineRes.data || [],
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
        labels: sorted.map(w => new Date(w.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })),
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

  const { weights, medicines, height } = data
  const latestWeight = weights[0]
  const bmi = latestWeight ? calculateBMI(latestWeight.weight_lbs, height) : '--'

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
      </div>

      <div class="card">
        <h2>Weight Trend</h2>
        <div class="chart-container"><canvas ref={chartRef} /></div>
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
                  <td>{m.health_medications?.brand_name || '?'}</td>
                  <td>{m.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style="text-align:center;padding:24px 0 8px">
        <button class="btn btn-secondary btn-sm" onClick={handleSignOut}>Sign Out</button>
      </div>
    </div>
  )
}
