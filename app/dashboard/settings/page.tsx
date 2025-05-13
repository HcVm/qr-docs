"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "@/components/theme-provider"
import { Moon, Sun, Globe } from "lucide-react"

export default function SettingsPage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const supabase = createClientSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userSettings, setUserSettings] = useState({
    theme: "system",
    notifications: {
      email: true,
      browser: true,
      documents: true,
      movements: true,
    },
    language: "es",
    privacy: {
      showActivity: true,
    },
  })

  useEffect(() => {
    if (!session) return

    const fetchUserSettings = async () => {
      setLoading(true)
      try {
        // Aquí normalmente obtendríamos la configuración del usuario desde la base de datos
        // Por ahora, usamos valores predeterminados

        // Establecer el tema según la preferencia del usuario o el tema actual
        setUserSettings((prev) => ({
          ...prev,
          theme: theme || "system",
        }))
      } catch (error) {
        console.error("Error fetching user settings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserSettings()
  }, [session, theme])

  const handleThemeChange = (value: string) => {
    setUserSettings((prev) => ({ ...prev, theme: value }))
    setTheme(value)
  }

  const handleNotificationChange = (key: string, value: boolean) => {
    setUserSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }))
  }

  const handleLanguageChange = (value: string) => {
    setUserSettings((prev) => ({ ...prev, language: value }))
  }

  const handlePrivacyChange = (key: string, value: boolean) => {
    setUserSettings((prev) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value,
      },
    }))
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // Aquí normalmente guardaríamos la configuración en la base de datos
      // Por ahora, solo mostramos un mensaje de éxito

      toast({
        title: "Configuración guardada",
        description: "Tus preferencias han sido actualizadas correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Cargando configuración...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="privacy">Privacidad</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>Personaliza la apariencia de la aplicación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select value={userSettings.theme} onValueChange={handleThemeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          <span>Claro</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          <span>Oscuro</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <span>Sistema</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Idioma</CardTitle>
                <CardDescription>Configura el idioma de la aplicación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select value={userSettings.language} onValueChange={handleLanguageChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>Español</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>English</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificaciones</CardTitle>
              <CardDescription>Configura cómo y cuándo recibir notificaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Notificaciones por correo</Label>
                    <p className="text-sm text-muted-foreground">Recibir notificaciones por correo electrónico</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={userSettings.notifications.email}
                    onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="browser-notifications">Notificaciones del navegador</Label>
                    <p className="text-sm text-muted-foreground">Recibir notificaciones en el navegador</p>
                  </div>
                  <Switch
                    id="browser-notifications"
                    checked={userSettings.notifications.browser}
                    onCheckedChange={(checked) => handleNotificationChange("browser", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="document-notifications">Documentos</Label>
                    <p className="text-sm text-muted-foreground">Notificaciones sobre nuevos documentos</p>
                  </div>
                  <Switch
                    id="document-notifications"
                    checked={userSettings.notifications.documents}
                    onCheckedChange={(checked) => handleNotificationChange("documents", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="movement-notifications">Movimientos</Label>
                    <p className="text-sm text-muted-foreground">Notificaciones sobre movimientos de documentos</p>
                  </div>
                  <Switch
                    id="movement-notifications"
                    checked={userSettings.notifications.movements}
                    onCheckedChange={(checked) => handleNotificationChange("movements", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacidad</CardTitle>
              <CardDescription>Configura tus preferencias de privacidad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-activity">Mostrar actividad</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir que otros usuarios vean tu actividad reciente
                  </p>
                </div>
                <Switch
                  id="show-activity"
                  checked={userSettings.privacy.showActivity}
                  onCheckedChange={(checked) => handlePrivacyChange("showActivity", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </div>
  )
}
