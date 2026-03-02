import { createClient } from '@supabase/supabase-js'

// PLAK HIER JE EIGEN GEGEVENS UIT HET SUPABASE DASHBOARD (Settings > API)
const supabaseUrl = 'https://jffnfkloolypvdrnxsvg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZm5ma2xvb2x5cHZkcm54c3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjU3NjksImV4cCI6MjA4ODA0MTc2OX0.T-_cwIcConpqyN7FOefCjk9ZByo5QigyDDn7CuHlGng'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
