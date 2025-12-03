import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zmzytrwrjdgcrgelxnph.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptenl0cndyamRnY3JnZWx4bnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTYxMjEsImV4cCI6MjA4MDMzMjEyMX0.0M-TsOQrYNw5ekqScSU4gppymKrP3vkuc8wcdr0-DBU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)