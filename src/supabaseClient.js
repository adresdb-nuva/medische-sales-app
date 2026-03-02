import { createClient } from '@supabase/supabase-js'

// We halen de URL en Key uit de omgevingsvariabelen (veiligere methode)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'JOUW_SUPABASE_PROJECT_URL'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'JOUW_SUPABASE_ANON_KEY'

// De client wordt hier één keer aangemaakt en geëxporteerd
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
