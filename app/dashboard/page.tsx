"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Users, Building, Activity, Clock, Eye, BarChart3 } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    documents: 0,
    users: 0,
    departments: 0,
    movements: 0,
  })
  const [recentDocuments, setRecentDocuments] = useState<any[]>([])
  const [recentMovements, setRecentMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        // Obtener conteo de documentos
        const { count: documentsCount } = await supabase.from("documents").select("*", { count: "exact", head: true })

        // Obtener conteo de usuarios
        const { count: usersCount } = await supabase.from("users").select("*", { count: "exact", head: true })

        // Obtener conteo de departamentos
        const { count: departmentsCount } = await supabase
          .from("departments")
          .select("*", { count: "exact", head: true })

        // Obtener conteo de movimientos
        const { count: movementsCount } = await supabase.from("movements").select("*", { count: "exact", head: true })

        setStats({
          documents: documentsCount || 0,
          users: usersCount || 0,
          departments: departmentsCount || 0,
          movements: movementsCount || 0,
        })

        // Obtener documentos recientes
        const { data: documents, error: documentsError } = await supabase
          .from("documents")
          .select(`
            *,
            departments:department_id (
              id,
              name
            ),
            users:created_by (
              id,
              full_name
            )
          `)
          .order("created_at", { ascending: false })
          .limit(5)

        if (documentsError) throw documentsError
        setRecentDocuments(documents || [])

        // Obtener movimientos recientes
        const { data: movements, error: movementsError } = await supabase
          .from("movements")
          .select(`
            *,
            documents:document_id (
              id,
              document_code,
              title
            ),
            from_department:from_department_id (
              id,
              name
            ),
            to_department:to_department_id (
              id,
              name
            ),
            user:user_id (
              id,
              full_name
            )
          `)
          .order("created_at", { ascending: false })
          .limit(5)

        if (movementsError) throw movementsError
        setRecentMovements(movements || [])
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [supabase])

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      completado: "Completado",
      en_proceso: "En proceso",
      pendiente: "Pendiente",
      rechazado: "Rechazado",
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completado":
        return "bg-green-500"
      case "en_proceso":
        return "bg-blue-500"
      case "pendiente":
        return "bg-yellow-500"
      case "rechazado":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      creacion: "Creación",
      derivado: "Derivado",
      revision: "Revisión",
      pendiente: "Pendiente",
      en_proceso: "En Proceso",
      completado: "Completado",
      rechazado: "Rechazado",
    }
    return actionMap[action] || action
  }

  const statCards = [
    {
      title: "Documentos",
      value: stats.documents,
      description: "Total de documentos registrados",
      icon: FileText,
      color: "bg-blue-100 text-blue-800",
      link: "/dashboard/documents",
    },
    {
      title: "Usuarios",
      value: stats.users,
      description: "Usuarios registrados en el sistema",
      icon: Users,
      color: "bg-green-100 text-green-800",
      link: "/dashboard/users",
    },
    {
      title: "Departamentos",
      value: stats.departments,
      description: "Departamentos configurados",
      icon: Building,
      color: "bg-purple-100 text-purple-800",
      link: "/dashboard/departments",
    },
    {
      title: "Movimientos",
      value: stats.movements,
      description: "Total de movimientos registrados",
      icon: Activity,
      color: "bg-orange-100 text-orange-800",
      link: "/dashboard/stats",
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/dashboard/stats">
          <Button variant="outline" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Ver estadísticas detalladas
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link href={stat.link} key={stat.title}>
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`rounded-full p-2 ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documentos Recientes</CardTitle>
            <CardDescription>Últimos documentos registrados en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-3 w-[200px]" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay documentos registrados</p>
            ) : (
              <div className="space-y-4">
                {recentDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{doc.document_code}</span>
                        <Badge className={getStatusColor(doc.status)}>{formatStatus(doc.status)}</Badge>
                      </div>
                      <p className="text-sm">{doc.title}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Dept: {doc.departments ? doc.departments.name : "Sin departamento"}</span>
                        <span>•</span>
                        <span>
                          <Clock className="mr-1 inline-block h-3 w-3" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Link href={`/dashboard/documents/view/${doc.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
                <div className="pt-2 text-center">
                  <Link href="/dashboard/documents">
                    <Button variant="outline" size="sm">
                      Ver todos los documentos
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimos movimientos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-3 w-[200px]" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recentMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay movimientos registrados</p>
            ) : (
              <div className="space-y-4">
                {recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {movement.documents ? movement.documents.document_code : "Documento"}
                        </span>
                        <Badge variant="outline">{formatAction(movement.action)}</Badge>
                      </div>
                      <p className="text-sm">
                        {movement.documents ? movement.documents.title : "Título del documento"}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>De: {movement.from_department ? movement.from_department.name : "Origen"}</span>
                        <span>→</span>
                        <span>A: {movement.to_department ? movement.to_department.name : "Destino"}</span>
                        <span>•</span>
                        <span>
                          <Clock className="mr-1 inline-block h-3 w-3" />
                          {new Date(movement.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {movement.documents && (
                      <Link href={`/dashboard/documents/view/${movement.document_id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
                <div className="pt-2 text-center">
                  <Link href="/dashboard/stats">
                    <Button variant="outline" size="sm">
                      Ver estadísticas detalladas
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
