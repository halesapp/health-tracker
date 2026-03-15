import { supabase } from './supabase.js'
import { showToast } from './utils.js'

let currentUser = null
let onAuthChange = null

export function getUser() {
  return currentUser
}

export function setAuthChangeCallback(cb) {
  onAuthChange = cb
}

export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  currentUser = session?.user ?? null

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null
    if (onAuthChange) onAuthChange(currentUser)
  })

  return currentUser
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    showToast('Error signing out: ' + error.message, 'error')
  }
}
