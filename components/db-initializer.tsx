"use client"

import { useEffect } from "react"

export function DbInitializer() {
  useEffect(() => {
    const checkNotificationsTable = async () => {
      try {
        // Solo verificamos si la tabla existe, no intentamos crearla
        await fetch("/api/setup-notifications")
      } catch (error) {
        console.error("Error al verificar la tabla de notificaciones:", error)
      }
    }

    checkNotificationsTable()
  }, [])

  return null // Este componente no renderiza nada
}
