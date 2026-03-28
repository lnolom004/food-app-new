import { createClient } from '@supabase/supabase-js';

// 🌟 เปลี่ยนมาใช้รูปแบบนี้เพื่อให้รันได้ทั้งในเครื่องและ Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
