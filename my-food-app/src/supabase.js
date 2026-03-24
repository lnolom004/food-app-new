import { createClient } from '@supabase/supabase-js'

// 🔗 URL และ Key ของโปรเจกต์คุณ (ตรวจสอบให้ตรงกับหน้า Settings > API ใน Supabase นะครับ)
const supabaseUrl = 'https://xjlfyebokojtviztzmeh.supabase.co'
const supabaseKey = 'sb_publishable_C_blxojGGDxAK9SSN06OHQ_cz0PW_lf'

// 🚀 สร้างตัวเชื่อมต่อ (Client)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})
