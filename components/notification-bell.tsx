"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

type Notification = {
  id: string
  title: string
  message: string
  document_code: string
  document_id: string
  type: "info" | "success" | "warning" | "error"
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true)
      try {
        // Primero obtenemos la sesión actual
        const { data: sessionData } = await supabase.auth.getSession()

        if (!sessionData.session) {
          console.log("No hay sesión activa")
          setError("Usuario no autenticado")
          setLoading(false)
          return
        }

        const userId = sessionData.session.user.id
        console.log("Fetching notifications for user:", userId)

        // Intentar obtener notificaciones
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10)

        if (error) {
          // Si la tabla no existe, simplemente mostramos un mensaje en la consola
          if (error.message.includes("does not exist")) {
            console.log("La tabla de notificaciones no está disponible")
            setError("Sistema de notificaciones no disponible")
          } else {
            console.error("Error al cargar notificaciones:", error)
            setError("Error al cargar notificaciones")
          }
          setNotifications([])
          setUnreadCount(0)
        } else {
          // Todo bien, tenemos notificaciones
          console.log("Notifications loaded:", data?.length || 0)
          setNotifications(data || [])
          setUnreadCount(data?.filter((n) => !n.read).length || 0)
          setError(null)
        }
      } catch (err) {
        console.error("Error fetching notifications:", err)
        setError("Error al cargar notificaciones")
        setNotifications([])
        setUnreadCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Configurar suscripción para notificaciones en tiempo real
    const setupRealtimeSubscription = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) return

        const userId = sessionData.session.user.id

        const subscription = supabase
          .channel("notifications_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              console.log("Notification change detected:", payload)
              fetchNotifications()
            },
          )
          .subscribe()

        return () => {
          subscription.unsubscribe()
        }
      } catch (err) {
        console.error("Error setting up realtime subscription:", err)
      }
    }

    setupRealtimeSubscription()
  }, [supabase])

  const markAsRead = async (id: string) => {
    try {
      const { error: updateError } = await supabase.from("notifications").update({ read: true }).eq("id", id)

      if (updateError) throw updateError

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const markAllAsRead = async () => {
    if (notifications.length === 0) return

    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
      if (unreadIds.length === 0) return

      const { error: updateError } = await supabase.from("notifications").update({ read: true }).in("id", unreadIds)

      if (updateError) throw updateError

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error("Error marking all notifications as read:", err)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id)

      if (error) throw error

      setNotifications((prev) => prev.filter((n) => n.id !== id))
      toast({
        title: "Notificación eliminada",
        description: "La notificación ha sido eliminada correctamente",
      })
    } catch (err) {
      console.error("Error deleting notification:", err)
      toast({
        title: "Error",
        description: "No se pudo eliminar la notificación",
        variant: "destructive",
      })
    }
  }

  const deleteAllRead = async () => {
    const readNotifications = notifications.filter((n) => n.read)
    if (readNotifications.length === 0) return

    try {
      const readIds = readNotifications.map((n) => n.id)
      const { error } = await supabase.from("notifications").delete().in("id", readIds)

      if (error) throw error

      setNotifications((prev) => prev.filter((n) => !n.read))
      toast({
        title: "Notificaciones eliminadas",
        description: "Todas las notificaciones leídas han sido eliminadas",
      })
    } catch (err) {
      console.error("Error deleting read notifications:", err)
      toast({
        title: "Error",
        description: "No se pudieron eliminar las notificaciones leídas",
        variant: "destructive",
      })
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "warning":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h3 className="font-medium">Notificaciones</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Marcar todas como leídas
              </Button>
            )}
            {notifications.filter((n) => n.read).length > 0 && (
              <Button variant="ghost" size="sm" onClick={deleteAllRead} className="text-red-500 hover:text-red-700">
                <Trash2 className="mr-1 h-3 w-3" />
                Eliminar leídas
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Cargando notificaciones...</div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-muted-foreground">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No tienes notificaciones</div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className={`border-b p-3 ${!notification.read ? "bg-muted/50" : ""}`}>
                <div className="mb-1 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${getNotificationColor(notification.type)}`}>
                    {notification.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{notification.message}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Link
                    href={`/dashboard/documents/view/${notification.document_id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Ver documento {notification.document_code}
                  </Link>
                  <div className="flex gap-1">
                    {!notification.read ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="h-7 px-2 text-xs"
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Leída
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        className="h-7 px-2 text-xs text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t p-2">
          <Link href="/dashboard/notifications">
            <Button variant="ghost" size="sm" className="w-full">
              Ver todas las notificaciones
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
