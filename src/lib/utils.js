import { supabase } from './supabase.js'

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

export function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  })
}

export function formatDateTimeFull(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  })
}

export function toLocalDatetimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export function calculateBMI(weightLbs, heightInches = 65) {
  const weightKg = weightLbs / 2.20462
  const heightM = heightInches / 39.3701
  return (weightKg / (heightM * heightM)).toFixed(1)
}

let _cachedHeight = null

export async function getUserHeight() {
  if (_cachedHeight) return _cachedHeight
  const { data } = await supabase.from('user_profile').select('height_inches').single()
  _cachedHeight = data?.height_inches || 65
  return _cachedHeight
}

export function clearCachedHeight() {
  _cachedHeight = null
}

export function showToast(message, type = 'success') {
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  document.body.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('show'))
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 2500)
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}
