import { createClient } from '@supabase/supabase-js'

// PLAK HIER JE EIGEN GEGEVENS UIT HET SUPABASE DASHBOARD (Settings > API)
const supabaseUrl = 'https://jffnfkloolypvdrnxsvg.supabase.co'
const supabaseAnonKey = 'sb_publishable_qLNyJAt6dph5Kd-atQ051A_MaRU5eKL'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
