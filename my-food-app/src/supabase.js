import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ พบข้อผิดพลาด: ไม่พบ URL หรือ Anon Key ของ Supabase กรุณาเช็คไฟล์ .env หรือการตั้งค่าใน Vercel");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
