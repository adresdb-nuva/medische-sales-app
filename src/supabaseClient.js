import { createClient } from '@supabase/supabase-js'

// PLAK HIER JE EIGEN GEGEVENS UIT HET SUPABASE DASHBOARD (Settings > API)
const supabaseUrl = 'https://jffnfkloolypvdrnxsvg.supabase.co'
const supabaseAnonKey = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_qLNyJAt6dph5Kd-atQ051A_MaRU5eKL'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
