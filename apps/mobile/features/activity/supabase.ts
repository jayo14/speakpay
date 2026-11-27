import { createClient } from '@supabase/supabase-js'
import { AppConfig } from '@/constants/app-config'

// Anon key: read + Realtime only. All writes go through apps/web with the service role (PRD §7).
export const supabase = createClient(AppConfig.supabaseUrl, AppConfig.supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
