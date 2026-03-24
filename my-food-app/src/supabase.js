import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://your-url.supabase.co'
const supabaseKey = 'your-anon-key'

// ให้เหลือแค่บรรทัดนี้ชุดเดียวพอครับ
export const supabase = createClient(supabaseUrl, supabaseKey) 
