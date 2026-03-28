// supabase.jsx
import { createClient } from '@supabase/supabase-js'

// ✅ ต้องเป็น import.meta.env เท่านั้น (ไม่ใช่ process.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
