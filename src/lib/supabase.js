import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  document.getElementById('app').innerHTML = `
    <div style="max-width:600px;margin:80px auto;padding:24px;font-family:system-ui;text-align:center;">
      <h2>Supabase not configured</h2>
      <p>Create a <code>.env</code> file in the project root with:</p>
      <pre style="text-align:left;background:#f4f4f4;padding:16px;border-radius:8px;">VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key</pre>
      <p>Then restart the dev server.</p>
    </div>
  `
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)