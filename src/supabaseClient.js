import { createClient } from '@supabase/supabase-js'

// PLAK HIER JE EIGEN GEGEVENS UIT HET SUPABASE DASHBOARD (Settings > API)
const supabaseUrl = 'https://jouw-project-url.supabase.co'
const supabaseAnonKey = 'jouw-lange-anon-key-hier'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
