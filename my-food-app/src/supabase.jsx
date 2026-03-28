import { createClient } from '@supabase/supabase-js';

// เชื่อมต่อตรงไปที่โปรเจกต์ Inolom004
const supabaseUrl = 'https://xjlfyebokojtviztzmeh.supabase.co';
const supabaseAnonKey = 'sb_publishable_C_blxojGGDxAK9SSN06OHQ_cz0PW_lf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
