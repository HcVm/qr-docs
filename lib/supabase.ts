import { createClient } from "@supabase/supabase-js"

// Tipos para nuestras tablas
export type Department = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type User = {
  id: string
  email: string
  full_name: string
  department_id: string | null
  role: string
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  document_code: string
  title: string
  description: string | null
  status: string
  created_by: string
  department_id: string
  created_at: string
  updated_at: string
}

export type Movement = {
  id: string
  document_id: string
  from_department_id: string | null
  to_department_id: string
  action: string
  notes: string | null
  user_id: string
  created_at: string
}

// Cliente para el lado del servidor
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

// Cliente para el lado del cliente (singleton)
let clientSupabaseInstance: ReturnType<typeof createClient> | null = null

export const createClientSupabaseClient = () => {
  if (clientSupabaseInstance) return clientSupabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  clientSupabaseInstance = createClient(supabaseUrl, supabaseKey)
  return clientSupabaseInstance
}
