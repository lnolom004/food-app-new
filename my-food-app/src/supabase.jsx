import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xjlfyebokojtviztzmeh.supabase.co'
const supabaseKey = 'sb_publishable_C_blxojGGDxAK9SSN06OHQ_cz0PW_lf'

export const supabase = createClient(supabaseUrl, supabaseKey)
        