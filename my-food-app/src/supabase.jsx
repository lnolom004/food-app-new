import { createClient } from '@supabase/supabase-js';

// ✅ เปลี่ยนมาใช้ตัวแปรระบบ ( Environment Variables ) เพื่อให้ Vercel อ่านค่าได้ชัวร์
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
