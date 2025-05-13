"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { createClientSupabaseClient } from "@/lib/supabase"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Bell, Check, CheckCheck, Clock, FileText, RefreshCw, ShieldAlert, Trash2 } from "lucide-react"

type Notification = {
  id: string
  user_id: string
  title: string
  message: string
  document_code: string
  document_id: string
  type: "info" | "success" | "warning" | "error"
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [markingAll, setMarkingAll] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  // Función para cargar notificaciones
  const fetchNotifications = async () => {
    setLoading(true)
    setError(null)

    try {
      // Primero obtenemos la sesión actual
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        setError("Usuario no autenticado. Por favor, inicia sesión para ver tus notificaciones.")
        setLoading(false)
        return
      }

      const userId = sessionData.session.user.id
      console.log("Fetching notifications for user:", userId)

      // Obtener notificaciones directamente
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching notifications:", error)

        // Manejar error específico de tabla no existente
        if (error.message.includes("does not exist")) {
          setError("La tabla de notificaciones no existe en la base de datos")
        } else {
          setError(`Error al cargar notificaciones: ${error.message}`)
        }

        toast({
          title: "Error",
          description: `No se pudieron cargar las notificaciones: ${error.message}`,
          variant: "destructive",
        })
        return
      }

      console.log("Notifications fetched:", data)
      setNotifications(data || [])
    } catch (error: any) {
      console.error("Exception fetching notifications:", error)
      setError(`Error al cargar notificaciones: ${error.message || "Error desconocido"}`)
      toast({
        title: "Error",
        description: "No se pudieron cargar las notificaciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    fetchNotifications()

    // Configurar suscripción para notificaciones en tiempo real
    const setupRealtimeSubscription = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) return

        const userId = sessionData.session.user.id

        const subscription = supabase
          .channel("notifications_page_changes")
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
  }, [])

  // Filtrar notificaciones según la pestaña activa
  useEffect(() => {
    if (activeTab === "all") {
      setFilteredNotifications(notifications)
    } else if (activeTab === "unread") {
      setFilteredNotifications(notifications.filter((n) => !n.read))
    } else if (activeTab === "read") {
      setFilteredNotifications(notifications.filter((n) => n.read))
    }
  }, [activeTab, notifications])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id)

      if (error) {
        console.error("Error marking notification as read:", error)
        toast({
          title: "Error",
          description: "No se pudo marcar la notificación como leída",
          variant: "destructive",
        })
        return
      }

      // Actualizar el estado local
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

      toast({
        title: "Notificación marcada como leída",
        description: "La notificación ha sido marcada como leída correctamente",
      })
    } catch (error: any) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "No se pudo marcar la notificación como leída",
        variant: "destructive",
      })
    }
  }

  const markAllAsRead = async () => {
    if (notifications.filter((n) => !n.read).length === 0) {
      toast({
        title: "Información",
        description: "No hay notificaciones sin leer",
      })
      return
    }

    setMarkingAll(true)
    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)

      const { error } = await supabase.from("notifications").update({ read: true }).in("id", unreadIds)

      if (error) {
        console.error("Error marking all notifications as read:", error)
        toast({
          title: "Error",
          description: "No se pudieron marcar todas las notificaciones como leídas",
          variant: "destructive",
        })
        return
      }

      // Actualizar el estado local
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

      toast({
        title: "Notificaciones marcadas como leídas",
        description: "Todas las notificaciones han sido marcadas como leídas",
      })
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "No se pudieron marcar todas las notificaciones como leídas",
        variant: "destructive",
      })
    } finally {
      setMarkingAll(false)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id)

      if (error) {
        console.error("Error deleting notification:", error)
        toast({
          title: "Error",
          description: "No se pudo eliminar la notificación",
          variant: "destructive",
        })
        return
      }

      // Actualizar el estado local
      setNotifications((prev) => prev.filter((n) => n.id !== id))

      toast({
        title: "Notificación eliminada",
        description: "La notificación ha sido eliminada correctamente",
      })
    } catch (error: any) {
      console.error("Error deleting notification:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la notificación",
        variant: "destructive",
      })
    }
  }

  const deleteAllRead = async () => {
    const readNotifications = notifications.filter((n) => n.read)
    if (readNotifications.length === 0) {
      toast({
        title: "Información",
        description: "No hay notificaciones leídas para eliminar",
      })
      return
    }

    setDeletingAll(true)
    try {
      const readIds = readNotifications.map((n) => n.id)
      const { error } = await supabase.from("notifications").delete().in("id", readIds)

      if (error) {
        console.error("Error deleting read notifications:", error)
        toast({
          title: "Error",
          description: "No se pudieron eliminar las notificaciones leídas",
          variant: "destructive",
        })
        return
      }

      // Actualizar el estado local
      setNotifications((prev) => prev.filter((n) => !n.read))

      toast({
        title: "Notificaciones eliminadas",
        description: "Todas las notificaciones leídas han sido eliminadas",
      })

      setShowDeleteDialog(false)
    } catch (error: any) {
      console.error("Error deleting read notifications:", error)
      toast({
        title: "Error",
        description: "No se pudieron eliminar las notificaciones leídas",
        variant: "destructive",
      })
    } finally {
      setDeletingAll(false)
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <Check className="h-5 w-5 text-green-600" />
      case "error":
        return <Clock className="h-5 w-5 text-red-600" />
      case "warning":
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <Bell className="h-5 w-5 text-blue-600" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.round(diffMs / 60000)
    const diffHours = Math.round(diffMins / 60)
    const diffDays = Math.round(diffHours / 24)

    if (diffMins < 60) {
      return `Hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`
    } else if (diffHours < 24) {
      return `Hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`
    } else if (diffDays < 7) {
      return `Hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`
    } else {
      return date.toLocaleDateString()
    }
  }

  // Si no está autenticado, mostrar mensaje de error
  if (error && error.includes("Usuario no autenticado")) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Notificaciones</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <ShieldAlert className="h-16 w-16 text-red-500" />
            <h2 className="mt-4 text-xl font-semibold">Acceso denegado</h2>
            <p className="mt-2 text-muted-foreground">Debes iniciar sesión para ver tus notificaciones.</p>
            <div className="mt-6 flex gap-4">
              <Button onClick={() => router.push("/auth/login")}>Iniciar sesión</Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Volver al dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notificaciones</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {loading ? "Cargando..." : "Actualizar"}
          </Button>
          <Button
            variant="outline"
            onClick={markAllAsRead}
            disabled={markingAll || loading || notifications.filter((n) => !n.read).length === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            {markingAll ? "Marcando..." : "Marcar todas como leídas"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deletingAll || loading || notifications.filter((n) => n.read).length === 0}
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deletingAll ? "Eliminando..." : "Eliminar leídas"}
          </Button>
        </div>
      </div>

      {error && !error.includes("Usuario no autenticado") && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-800">
            <p className="font-semibold">Error al cargar notificaciones:</p>
            <p className="text-sm">{error}</p>
            <p className="mt-2 text-sm">
              Intenta actualizar la página o verifica que la tabla de notificaciones exista en la base de datos.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">
            Todas
            {notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            No leídas
            {notifications.filter((n) => !n.read).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.filter((n) => !n.read).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="read">
            Leídas
            {notifications.filter((n) => n.read).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.filter((n) => n.read).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <NotificationsList
            notifications={filteredNotifications}
            loading={loading}
            markAsRead={markAsRead}
            deleteNotification={deleteNotification}
            getNotificationColor={getNotificationColor}
            getNotificationIcon={getNotificationIcon}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="unread">
          <NotificationsList
            notifications={filteredNotifications}
            loading={loading}
            markAsRead={markAsRead}
            deleteNotification={deleteNotification}
            getNotificationColor={getNotificationColor}
            getNotificationIcon={getNotificationIcon}
            formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="read">
          <NotificationsList
            notifications={filteredNotifications}
            loading={loading}
            markAsRead={markAsRead}
            deleteNotification={deleteNotification}
            getNotificationColor={getNotificationColor}
            getNotificationIcon={getNotificationIcon}
            formatDate={formatDate}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar notificaciones leídas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente todas las notificaciones que ya has leído. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                deleteAllRead()
              }}
              disabled={deletingAll}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {deletingAll ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface NotificationsListProps {
  notifications: Notification[]
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  getNotificationColor: (type: string) => string
  getNotificationIcon: (type: string) => JSX.Element
  formatDate: (dateString: string) => string
}

function NotificationsList({
  notifications,
  loading,
  markAsRead,
  deleteNotification,
  getNotificationColor,
  getNotificationIcon,
  formatDate,
}: NotificationsListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No hay notificaciones</h3>
          <p className="mt-2 text-sm text-muted-foreground">No tienes notificaciones en esta categoría.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification: Notification) => (
        <Card key={notification.id} className={notification.read ? "opacity-75" : ""}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className={`rounded-full p-2 ${getNotificationColor(notification.type)}`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{notification.title}</h3>
                  <span className="text-xs text-muted-foreground">{formatDate(notification.created_at)}</span>
                </div>
                <p className="mt-1 text-sm">{notification.message}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Link
                    href={`/dashboard/documents/view/${notification.document_id}`}
                    className="flex items-center text-xs text-primary hover:underline"
                  >
                    <FileText className="mr-1 h-3 w-3" />
                    Ver documento {notification.document_code}
                  </Link>
                  <div className="flex gap-2">
                    {!notification.read ? (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)} className="text-xs">
                        <Check className="mr-1 h-3 w-3" />
                        Marcar como leída
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
