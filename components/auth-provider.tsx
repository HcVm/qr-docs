"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"

type AuthContextType = {
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const getSession = async () => {
      try {
        // Configuramos Supabase para persistir la sesión automáticamente
        // Esto usa localStorage por defecto
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
          setSession(null)
        } else {
          setSession(data.session)
        }
      } catch (err) {
        console.error("Error in getSession:", err)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Suscribirse a cambios en la autenticación
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, session ? "session exists" : "no session")
      setSession(session)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setSession(null)
      router.push("/auth/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Determinar si se debe mostrar el contenido o redirigir
  useEffect(() => {
    // Solo redirigir si no estamos cargando, no hay sesión y no es una ruta pública
    if (!loading && !session && !isPublicRoute(pathname)) {
      router.push("/auth/login")
    }
  }, [loading, session, pathname, router])

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {loading ? (
        // Mostrar un indicador de carga mientras se verifica la sesión
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

// Función para determinar si una ruta es pública
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ["/", "/auth/login", "/auth/register", "/auth/reset-password"]
  return publicRoutes.includes(pathname) || pathname.startsWith("/_next") || pathname.startsWith("/api")
}
