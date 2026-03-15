import {defineConfig} from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://tnkofoarfyudzojkioos.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('sb_publishable_bYzQW6M1F8vJdxwABlrpyQ_mtFvl_WB'),
  },
})
