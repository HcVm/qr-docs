"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Activity } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProfilePage() {
  const { session } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [userStats, setUserStats] = useState({
    documents: 0,
    movements: 0,
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (!session) {
      router.push("/auth/login")
      return
    }

    const fetchUserData = async () => {
      setLoading(true)
      try {
        // Obtener perfil del usuario
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (profileError) throw profileError

        setUserProfile(profile)
        setFormData({
          full_name: profile.full_name || "",
          email: profile.email || "",
        })

        // Obtener estadísticas del usuario
        const { count: documentsCount } = await supabase
          .from("documents")
          .select("*", { count: "exact", head: true })
          .eq("created_by", session.user.id)

        const { count: movementsCount } = await supabase
          .from("movements")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)

        setUserStats({
          documents: documentsCount || 0,
          movements: movementsCount || 0,
        })

        // Obtener actividad reciente
        const { data: movements, error: movementsError } = await supabase
          .from("movements")
          .select(`
            *,
            documents:document_id (
              id,
              document_code,
              title
            ),
            to_department:to_department_id (
              id,
              name
            )
          `)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(5)

        if (movementsError) throw movementsError

        setRecentActivity(movements || [])
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar la información del usuario",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [session, supabase, router, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))
  }

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)

    try {
      // Actualizar perfil en la tabla users
      const { error: updateError } = await supabase
        .from("users")
        .update({
          full_name: formData.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session?.user.id)

      if (updateError) throw updateError

      // Actualizar email en auth si ha cambiado
      if (formData.email !== userProfile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email,
        })

        if (emailError) throw emailError
      }

      toast({
        title: "Perfil actualizado",
        description: "Tu información ha sido actualizada correctamente",
      })

      // Actualizar el estado local
      setUserProfile((prev: any) => ({
        ...prev,
        full_name: formData.full_name,
        email: formData.email,
      }))
    } catch (error: any) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)

    try {
      // Validar que las contraseñas coincidan
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error("Las contraseñas nuevas no coinciden")
      }

      // Validar longitud mínima
      if (passwordData.newPassword.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      // Verificar contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: passwordData.currentPassword,
      })

      if (signInError) {
        throw new Error("La contraseña actual es incorrecta")
      }

      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (updateError) throw updateError

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada correctamente",
      })

      // Limpiar el formulario
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error: any) {
      console.error("Error updating password:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la contraseña",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      creacion: "Creación",
      derivado: "Derivado",
      revision: "Revisión",
      pendiente: "Pendiente",
      completado: "Completado",
      rechazado: "Rechazado",
    }
    return actionMap[action] || action
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Perfil de Usuario</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Perfil de Usuario</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Tabs defaultValue="profile">
            <TabsList className="mb-4">
              <TabsTrigger value="profile">Información Personal</TabsTrigger>
              <TabsTrigger value="security">Seguridad</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Información Personal</CardTitle>
                  <CardDescription>Actualiza tu información personal</CardDescription>
                </CardHeader>
                <form onSubmit={updateProfile}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nombre completo</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        placeholder="Tu nombre completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="tu@ejemplo.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Si cambias tu correo electrónico, recibirás un enlace de confirmación en la nueva dirección.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Departamento</Label>
                      <Input
                        value={userProfile?.department_id ? "Departamento asignado" : "Sin departamento asignado"}
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        El departamento solo puede ser asignado por un administrador.
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={updating}>
                      {updating ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Seguridad</CardTitle>
                  <CardDescription>Actualiza tu contraseña</CardDescription>
                </CardHeader>
                <form onSubmit={updatePassword}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Contraseña actual</Label>
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nueva contraseña</Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={updating}>
                      {updating ? "Actualizando..." : "Actualizar contraseña"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tu Perfil</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src="/placeholder.svg" alt={userProfile?.full_name} />
                <AvatarFallback className="text-2xl">
                  {userProfile?.full_name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <h3 className="mt-4 text-xl font-semibold">{userProfile?.full_name}</h3>
              <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
              <p className="mt-2 text-sm">
                Rol: <span className="font-medium capitalize">{userProfile?.role || "Usuario"}</span>
              </p>

              <Separator className="my-4" />

              <div className="grid w-full grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{userStats.documents}</p>
                  <p className="text-xs text-muted-foreground">Documentos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.movements}</p>
                  <p className="text-xs text-muted-foreground">Movimientos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No hay actividad reciente</p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2">
                      <Activity className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{formatAction(activity.action)}</span> del documento{" "}
                          <span className="font-medium">
                            {activity.documents ? activity.documents.document_code : "Documento"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
