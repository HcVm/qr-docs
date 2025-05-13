"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notification-bell"
import {
  LayoutDashboard,
  Users,
  Building,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  QrCode,
  Bell,
  User,
  BarChart3,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { signOut, session } = useAuth()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Documentos", href: "/dashboard/documents", icon: FileText },
    { name: "Estadísticas", href: "/dashboard/stats", icon: BarChart3 },
    { name: "Usuarios", href: "/dashboard/users", icon: Users },
    { name: "Departamentos", href: "/dashboard/departments", icon: Building },
    { name: "Notificaciones", href: "/dashboard/notifications", icon: Bell },
    { name: "Escanear QR", href: "/", icon: QrCode },
  ]

  const userNavigation = [
    { name: "Perfil", href: "/dashboard/profile", icon: User },
    { name: "Configuración", href: "/dashboard/settings", icon: Settings },
  ]

  // Obtener las iniciales del nombre del usuario
  const getUserInitials = () => {
    if (!session?.user) return "U"

    // Intentar obtener el nombre completo de los metadatos del usuario
    const fullName = session.user.user_metadata?.full_name || ""

    if (fullName) {
      return fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    }

    // Si no hay nombre completo, usar la primera letra del email
    const email = session.user.email || ""
    return email ? email[0].toUpperCase() : "U"
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar para móvil */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          sidebarOpen ? "block" : "hidden"
        } bg-gray-600 bg-opacity-75 transition-opacity`}
        onClick={() => setSidebarOpen(false)}
      />

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white transition duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <button
            type="button"
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-5 flex-1 space-y-1 px-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                pathname === item.href
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  pathname === item.href ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500"
                }`}
              />
              {item.name}
            </Link>
          ))}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</h3>
            {userNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                  pathname === item.href
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    pathname === item.href ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500"
                  }`}
                />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t border-gray-200 p-4">
          <Button variant="outline" className="w-full justify-start" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
          <button
            type="button"
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4 flex items-center lg:ml-0">
            <span className="font-medium">Seguimiento de Documentos</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/dashboard/profile" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:block">
                {session?.user?.user_metadata?.full_name || session?.user?.email || "Usuario"}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
