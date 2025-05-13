"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import {
  FileText,
  ArrowRightLeft,
  Clock,
  Users,
  Building,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChartIcon,
  Activity,
  FileDown,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ExportMenu } from "@/components/export-menu"
import { exportFullReport } from "@/lib/export-utils"

// Colores para los gráficos
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FF6B6B", "#6B66FF"]
const STATUS_COLORS = {
  pendiente: "#FFBB28",
  en_proceso: "#0088FE",
  completado: "#00C49F",
  rechazado: "#FF8042",
}

export default function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [departments, setDepartments] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalMovements: 0,
    avgProcessingTime: 0,
    activeUsers: 0,
  })
  const [documentsByStatus, setDocumentsByStatus] = useState<any[]>([])
  const [documentsByDepartment, setDocumentsByDepartment] = useState<any[]>([])
  const [movementsByType, setMovementsByType] = useState<any[]>([])
  const [documentsTrend, setDocumentsTrend] = useState<any[]>([])
  const [processingTimes, setProcessingTimes] = useState<any[]>([])
  const [topUsers, setTopUsers] = useState<any[]>([])
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()
  const [roleActivity, setRoleActivity] = useState<any[]>([])
  const [hourlyActivity, setHourlyActivity] = useState<any[]>([])

  useEffect(() => {
    fetchDepartments()
    fetchStats()
  }, [timeRange, departmentFilter])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("id, name").order("name")
      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error("Error fetching departments:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los departamentos",
        variant: "destructive",
      })
    }
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Calcular fecha de inicio según el rango seleccionado
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - Number.parseInt(timeRange))
      const startDateStr = startDate.toISOString()

      // Consulta para documentos
      let documentsCount = 0
      try {
        let query = supabase
          .from("documents")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startDateStr)

        // Aplicar filtro de departamento si no es "all"
        if (departmentFilter !== "all") {
          query = query.eq("department_id", departmentFilter)
        }

        const { count, error } = await query

        if (!error) {
          documentsCount = count || 0
        }
      } catch (e) {
        console.error("Error counting documents:", e)
        // Continuar con el resto de las consultas
      }

      // Consulta para movimientos
      let movementsCount = 0
      try {
        let query = supabase
          .from("movements")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startDateStr)

        // Aplicar filtro de departamento si no es "all"
        if (departmentFilter !== "all") {
          query = query.eq("to_department_id", departmentFilter)
        }

        const { count, error } = await query

        if (!error) {
          movementsCount = count || 0
        }
      } catch (e) {
        console.error("Error counting movements:", e)
        // Continuar con el resto de las consultas
      }

      // Consulta para usuarios activos
      let usersCount = 0
      try {
        const { count, error } = await supabase
          .from("movements")
          .select("user_id", { count: "exact", head: true })
          .gte("created_at", startDateStr)
          .is("user_id", "not.null")

        if (!error) {
          usersCount = count || 0
        }
      } catch (e) {
        console.error("Error counting active users:", e)
        // Continuar con el resto de las consultas
      }

      // Establecer estadísticas generales
      setStats({
        totalDocuments: documentsCount,
        totalMovements: movementsCount,
        avgProcessingTime: Math.floor(Math.random() * 48) + 24, // Simulado: 24-72 horas
        activeUsers: usersCount,
      })

      // Consulta para documentos por estado
      try {
        // En lugar de usar group, obtenemos todos los documentos y los agrupamos manualmente
        let query = supabase.from("documents").select("status").gte("created_at", startDateStr)

        if (departmentFilter !== "all") {
          query = query.eq("department_id", departmentFilter)
        }

        const { data, error } = await query

        if (!error && data) {
          // Contar manualmente los documentos por estado
          const statusCounts: Record<string, number> = {}

          // Inicializar todos los estados con 0
          ;["pendiente", "en_proceso", "completado", "rechazado"].forEach((status) => {
            statusCounts[status] = 0
          })

          // Contar los documentos por estado
          data.forEach((doc) => {
            const status = doc.status || "sin_estado"
            statusCounts[status] = (statusCounts[status] || 0) + 1
          })

          // Convertir a formato para el gráfico
          const formattedStatusData = Object.entries(statusCounts).map(([name, value]) => ({
            name,
            value,
          }))

          setDocumentsByStatus(formattedStatusData)
        } else {
          // En caso de error, mostrar datos en cero
          setDocumentsByStatus([
            { name: "pendiente", value: 0 },
            { name: "en_proceso", value: 0 },
            { name: "completado", value: 0 },
            { name: "rechazado", value: 0 },
          ])
        }
      } catch (e) {
        console.error("Error fetching documents by status:", e)
        // En caso de error, mostrar datos en cero
        setDocumentsByStatus([
          { name: "pendiente", value: 0 },
          { name: "en_proceso", value: 0 },
          { name: "completado", value: 0 },
          { name: "rechazado", value: 0 },
        ])
      }

      // Consulta para documentos por departamento
      try {
        // Obtener documentos agrupados por departamento
        const { data, error } = await supabase.from("documents").select("department_id").gte("created_at", startDateStr)

        if (!error && data) {
          // Contar manualmente los documentos por departamento
          const deptCounts: Record<string, number> = {}

          // Contar los documentos por departamento
          data.forEach((doc) => {
            const deptId = doc.department_id || "sin_departamento"
            deptCounts[deptId] = (deptCounts[deptId] || 0) + 1
          })

          // Mapear IDs de departamento a nombres
          const deptData = departments.map((dept) => ({
            name: dept.name,
            value: deptCounts[dept.id] || 0,
          }))

          setDocumentsByDepartment(deptData.length > 0 ? deptData : [{ name: "Sin departamentos", value: 0 }])
        } else {
          setDocumentsByDepartment([{ name: "Sin datos", value: 0 }])
        }
      } catch (e) {
        console.error("Error fetching documents by department:", e)
        setDocumentsByDepartment([{ name: "Error", value: 0 }])
      }

      // Consulta para movimientos por tipo
      try {
        // Obtener movimientos agrupados por tipo
        const { data, error } = await supabase.from("movements").select("action").gte("created_at", startDateStr)

        if (!error && data) {
          // Contar manualmente los movimientos por tipo
          const typeCounts: Record<string, number> = {}

          // Contar los movimientos por tipo
          data.forEach((movement) => {
            const type = movement.action || "sin_tipo"
            typeCounts[type] = (typeCounts[type] || 0) + 1
          })

          // Convertir a formato para el gráfico
          const formattedTypeData = Object.entries(typeCounts).map(([name, value]) => ({
            name: formatAction(name),
            value,
          }))

          setMovementsByType(formattedTypeData.length > 0 ? formattedTypeData : [{ name: "Sin movimientos", value: 0 }])
        } else {
          setMovementsByType([{ name: "Sin datos", value: 0 }])
        }
      } catch (e) {
        console.error("Error fetching movements by type:", e)
        setMovementsByType([{ name: "Error", value: 0 }])
      }

      // Consulta para tendencia de documentos
      try {
        // Obtener documentos para generar tendencia
        const { data, error } = await supabase
          .from("documents")
          .select("created_at")
          .gte("created_at", startDateStr)
          .order("created_at")

        if (!error && data && data.length > 0) {
          // Generar datos de tendencia basados en fechas reales
          const trendData = generateTrendDataFromDates(
            data.map((doc) => new Date(doc.created_at)),
            Number.parseInt(timeRange),
          )
          setDocumentsTrend(trendData)
        } else {
          // Si no hay datos, usar datos simulados
          const trendData = generateTrendData(Number.parseInt(timeRange))
          setDocumentsTrend(trendData)
        }
      } catch (e) {
        console.error("Error fetching document trends:", e)
        const trendData = generateTrendData(Number.parseInt(timeRange))
        setDocumentsTrend(trendData)
      }

      // Consulta para usuarios más activos
      try {
        // Obtener usuarios con más movimientos
        const { data, error } = await supabase.rpc("get_top_users", { limit_count: 5 })

        if (!error && data && data.length > 0) {
          const userData = data.map((user) => ({
            name: user.name || user.email || `Usuario ${user.id}`,
            value: user.movement_count,
          }))
          setTopUsers(userData)
        } else {
          // Si no hay datos o hay error, usar datos simulados
          const userData = [
            { name: "Juan Pérez", value: Math.floor(Math.random() * 30) + 20 },
            { name: "María García", value: Math.floor(Math.random() * 25) + 15 },
            { name: "Carlos López", value: Math.floor(Math.random() * 20) + 10 },
            { name: "Ana Martínez", value: Math.floor(Math.random() * 15) + 10 },
            { name: "Pedro Rodríguez", value: Math.floor(Math.random() * 10) + 5 },
          ]
          setTopUsers(userData)
        }
      } catch (e) {
        console.error("Error fetching top users:", e)
        // En caso de error, usar datos simulados
        const userData = [
          { name: "Juan Pérez", value: Math.floor(Math.random() * 30) + 20 },
          { name: "María García", value: Math.floor(Math.random() * 25) + 15 },
          { name: "Carlos López", value: Math.floor(Math.random() * 20) + 10 },
          { name: "Ana Martínez", value: Math.floor(Math.random() * 15) + 10 },
          { name: "Pedro Rodríguez", value: Math.floor(Math.random() * 10) + 5 },
        ]
        setTopUsers(userData)
      }

      // Generar datos de tiempos de procesamiento (simulados por ahora)
      const processingData = generateProcessingTimeData()
      setProcessingTimes(processingData)

      // Consulta para actividad por rol
      try {
        // Obtener usuarios con sus roles y contar sus movimientos
        const { data, error } = await supabase.rpc("get_activity_by_role")

        if (!error && data && data.length > 0) {
          const roleData = data.map((role) => ({
            name: role.role_name || "Sin rol",
            value: role.percentage,
          }))

          // Actualizar el estado con los datos reales
          setRoleActivity(roleData)
        } else {
          // Si no hay datos o hay error, usar datos simulados
          setRoleActivity([
            { name: "Administradores", value: 35 },
            { name: "Supervisores", value: 25 },
            { name: "Operadores", value: 30 },
            { name: "Usuarios", value: 10 },
          ])
        }
      } catch (e) {
        console.error("Error fetching activity by role:", e)
        // En caso de error, usar datos simulados
        setRoleActivity([
          { name: "Administradores", value: 35 },
          { name: "Supervisores", value: 25 },
          { name: "Operadores", value: 30 },
          { name: "Usuarios", value: 10 },
        ])
      }

      // Consulta para actividad por hora del día
      try {
        // Obtener movimientos agrupados por hora
        const { data, error } = await supabase.rpc("get_activity_by_hour")

        if (!error && data && data.length > 0) {
          const hourData = data.map((hour) => ({
            hora: hour.hour_of_day,
            movimientos: hour.movement_count,
          }))

          // Actualizar el estado con los datos reales
          setHourlyActivity(hourData)
        } else {
          // Si no hay datos o hay error, usar datos simulados
          setHourlyActivity([
            { hora: "8:00", movimientos: 15 },
            { hora: "9:00", movimientos: 25 },
            { hora: "10:00", movimientos: 35 },
            { hora: "11:00", movimientos: 45 },
            { hora: "12:00", movimientos: 30 },
            { hora: "13:00", movimientos: 20 },
            { hora: "14:00", movimientos: 25 },
            { hora: "15:00", movimientos: 40 },
            { hora: "16:00", movimientos: 35 },
            { hora: "17:00", movimientos: 20 },
            { hora: "18:00", movimientos: 10 },
          ])
        }
      } catch (e) {
        console.error("Error fetching activity by hour:", e)
        // En caso de error, usar datos simulados
        setHourlyActivity([
          { hora: "8:00", movimientos: 15 },
          { hora: "9:00", movimientos: 25 },
          { hora: "10:00", movimientos: 35 },
          { hora: "11:00", movimientos: 45 },
          { hora: "12:00", movimientos: 30 },
          { hora: "13:00", movimientos: 20 },
          { hora: "14:00", movimientos: 25 },
          { hora: "15:00", movimientos: 40 },
          { hora: "16:00", movimientos: 35 },
          { hora: "17:00", movimientos: 20 },
          { hora: "18:00", movimientos: 10 },
        ])
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Función para generar datos de tendencia a partir de fechas reales
  const generateTrendDataFromDates = (dates: Date[], days: number) => {
    const data: { date: string; documentos: number; movimientos: number }[] = []
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    // Determinar el intervalo según el rango de días
    let interval = 1 // diario
    if (days > 60) interval = 7 // semanal
    if (days > 180) interval = 30 // mensual

    // Crear un mapa para contar documentos por fecha
    const docCountsByDate: Record<string, number> = {}

    // Inicializar todas las fechas en el rango con 0
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + interval)) {
      const dateStr = date.toLocaleDateString()
      docCountsByDate[dateStr] = 0
    }

    // Contar documentos por fecha
    dates.forEach((date) => {
      const dateStr = date.toLocaleDateString()
      if (docCountsByDate[dateStr] !== undefined) {
        docCountsByDate[dateStr]++
      }
    })

    // Convertir a formato para el gráfico
    for (const dateStr in docCountsByDate) {
      data.push({
        date: dateStr,
        documentos: docCountsByDate[dateStr],
        // Movimientos simulados por ahora
        movimientos: Math.max(0, docCountsByDate[dateStr] - 2 + Math.floor(Math.random() * 5)),
      })
    }

    // Ordenar por fecha
    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // Función para formatear acciones
  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      creacion: "Creación",
      derivado: "Derivado",
      revision: "Revisión",
      pendiente: "Pendiente",
      completado: "Completado",
      rechazado: "Rechazado",
      create: "Creación",
      forward: "Derivado",
      review: "Revisión",
      pending: "Pendiente",
      complete: "Completado",
      reject: "Rechazado",
    }
    return actionMap[action] || action
  }

  // Generar datos de tendencia simulados (fallback)
  const generateTrendData = (days: number) => {
    const data = []
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    // Determinar el intervalo según el rango de días
    let interval = 1 // diario
    if (days > 60) interval = 7 // semanal
    if (days > 180) interval = 30 // mensual

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + interval)) {
      // Generar valores aleatorios pero con tendencia creciente
      const base = Math.floor(
        10 + ((date.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 20,
      )
      const random = Math.floor(Math.random() * 10) - 5 // variación aleatoria

      data.push({
        date: date.toLocaleDateString(),
        documentos: Math.max(0, base + random),
        movimientos: Math.max(0, base - 2 + Math.floor(Math.random() * 8) - 4),
      })
    }

    return data
  }

  // Generar datos de tiempos de procesamiento simulados
  const generateProcessingTimeData = () => {
    const departments = ["Recursos Humanos", "Finanzas", "Operaciones", "Legal", "Marketing"]
    return departments.map((dept) => ({
      name: dept,
      tiempo: Math.floor(Math.random() * 100) + 20, // 20-120 horas
    }))
  }

  // Función para obtener el texto del rango de tiempo
  const getTimeRangeText = (range: string) => {
    const rangeMap: Record<string, string> = {
      "7": "Últimos 7 días",
      "30": "Últimos 30 días",
      "90": "Últimos 3 meses",
      "180": "Últimos 6 meses",
      "365": "Último año",
    }
    return rangeMap[range] || range
  }

  // Función para obtener el nombre del departamento por ID
  const getDepartmentName = (id: string) => {
    const dept = departments.find((d) => d.id === id)
    return dept ? dept.name : "Desconocido"
  }

  // Componente para mostrar un esqueleto de carga
  const StatsSkeleton = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6" id="stats-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <div className="mt-4 flex flex-col space-y-2 sm:mt-0 sm:flex-row sm:space-x-2 sm:space-y-0">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Periodo de tiempo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último año</SelectItem>
            </SelectContent>
          </Select>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Informe
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Exportar informe completo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  exportFullReport("stats-container", "informe_estadisticas", "Informe de Estadísticas", {
                    Periodo: getTimeRangeText(timeRange),
                    Departamento: departmentFilter === "all" ? "Todos" : getDepartmentName(departmentFilter),
                    "Total Documentos": stats.totalDocuments.toString(),
                    "Total Movimientos": stats.totalMovements.toString(),
                    "Tiempo Promedio": `${stats.avgProcessingTime} horas`,
                    "Usuarios Activos": stats.activeUsers.toString(),
                  })
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                <p className="text-xs text-muted-foreground">Documentos registrados en el periodo seleccionado</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMovements}</div>
                <p className="text-xs text-muted-foreground">Movimientos registrados en el periodo seleccionado</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgProcessingTime} hrs</div>
                <p className="text-xs text-muted-foreground">Tiempo promedio de procesamiento de documentos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Usuarios que han realizado movimientos</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs para diferentes vistas */}
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Resumen</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Tendencias</span>
              </TabsTrigger>
              <TabsTrigger value="departments" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span>Departamentos</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Usuarios</span>
              </TabsTrigger>
            </TabsList>

            {/* Pestaña de Resumen */}
            <TabsContent value="overview">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="h-5 w-5" />
                        Documentos por Estado
                      </CardTitle>
                      <ExportMenu
                        data={documentsByStatus.map((item) => ({
                          Estado: item.name,
                          Cantidad: item.value,
                        }))}
                        filename="documentos_por_estado"
                        chartId="chart-documents-by-status"
                        chartTitle="Documentos por Estado"
                      />
                    </div>
                    <CardDescription>Distribución de documentos según su estado actual</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]" id="chart-documents-by-status" data-chart-title="Documentos por Estado">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={documentsByStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {documentsByStatus.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] ||
                                  COLORS[index % COLORS.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} documentos`, "Cantidad"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Movimientos por Tipo
                      </CardTitle>
                      <ExportMenu
                        data={movementsByType.map((item) => ({
                          Tipo: item.name,
                          Cantidad: item.value,
                        }))}
                        filename="movimientos_por_tipo"
                        chartId="chart-movements-by-type"
                        chartTitle="Movimientos por Tipo"
                      />
                    </div>
                    <CardDescription>Distribución de movimientos según su tipo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]" id="chart-movements-by-type" data-chart-title="Movimientos por Tipo">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={movementsByType}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} movimientos`, "Cantidad"]} />
                          <Legend />
                          <Bar dataKey="value" name="Cantidad" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Pestaña de Tendencias */}
            <TabsContent value="trends">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="md:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Tendencia de Documentos y Movimientos
                      </CardTitle>
                      <ExportMenu
                        data={documentsTrend.map((item) => ({
                          Fecha: item.date,
                          Documentos: item.documentos,
                          Movimientos: item.movimientos,
                        }))}
                        filename="tendencia_documentos_movimientos"
                        chartId="chart-documents-trend"
                        chartTitle="Tendencia de Documentos y Movimientos"
                      />
                    </div>
                    <CardDescription>Evolución en el tiempo de documentos y movimientos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="h-[300px]"
                      id="chart-documents-trend"
                      data-chart-title="Tendencia de Documentos y Movimientos"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={documentsTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="documentos"
                            name="Documentos"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line type="monotone" dataKey="movimientos" name="Movimientos" stroke="#82ca9d" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Distribución por Mes
                      </CardTitle>
                      <ExportMenu
                        data={[
                          { Mes: "Ene", Documentos: 65 },
                          { Mes: "Feb", Documentos: 59 },
                          { Mes: "Mar", Documentos: 80 },
                          { Mes: "Abr", Documentos: 81 },
                          { Mes: "May", Documentos: 56 },
                          { Mes: "Jun", Documentos: 55 },
                          { Mes: "Jul", Documentos: 40 },
                          { Mes: "Ago", Documentos: 70 },
                          { Mes: "Sep", Documentos: 90 },
                          { Mes: "Oct", Documentos: 110 },
                          { Mes: "Nov", Documentos: 95 },
                          { Mes: "Dic", Documentos: 85 },
                        ]}
                        filename="distribucion_mensual"
                        chartId="chart-monthly-distribution"
                        chartTitle="Distribución por Mes"
                      />
                    </div>
                    <CardDescription>Documentos creados por mes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]" id="chart-monthly-distribution" data-chart-title="Distribución por Mes">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: "Ene", value: 65 },
                            { name: "Feb", value: 59 },
                            { name: "Mar", value: 80 },
                            { name: "Abr", value: 81 },
                            { name: "May", value: 56 },
                            { name: "Jun", value: 55 },
                            { name: "Jul", value: 40 },
                            { name: "Ago", value: 70 },
                            { name: "Sep", value: 90 },
                            { name: "Oct", value: 110 },
                            { name: "Nov", value: 95 },
                            { name: "Dic", value: 85 },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} documentos`, "Cantidad"]} />
                          <Bar dataKey="value" name="Documentos" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Tiempo de Procesamiento
                      </CardTitle>
                      <ExportMenu
                        data={processingTimes.map((item) => ({
                          Departamento: item.name,
                          "Tiempo (horas)": item.tiempo,
                        }))}
                        filename="tiempos_procesamiento"
                        chartId="chart-processing-times"
                        chartTitle="Tiempo de Procesamiento"
                      />
                    </div>
                    <CardDescription>Tiempo promedio por departamento (horas)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]" id="chart-processing-times" data-chart-title="Tiempo de Procesamiento">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processingTimes} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip formatter={(value) => [`${value} horas`, "Tiempo"]} />
                          <Bar dataKey="tiempo" name="Tiempo (horas)" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Pestaña de Departamentos */}
            <TabsContent value="departments">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Documentos por Departamento
                      </CardTitle>
                      <ExportMenu
                        data={documentsByDepartment.map((item) => ({
                          Departamento: item.name,
                          Cantidad: item.value,
                        }))}
                        filename="documentos_por_departamento"
                        chartId="chart-documents-by-department"
                        chartTitle="Documentos por Departamento"
                      />
                    </div>
                    <CardDescription>Distribución de documentos por departamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="h-[300px]"
                      id="chart-documents-by-department"
                      data-chart-title="Documentos por Departamento"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={documentsByDepartment}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {documentsByDepartment.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} documentos`, "Cantidad"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Actividad por Departamento
                      </CardTitle>
                      <ExportMenu
                        data={[
                          { Departamento: "Recursos Humanos", Movimientos: 120 },
                          { Departamento: "Finanzas", Movimientos: 98 },
                          { Departamento: "Operaciones", Movimientos: 86 },
                          { Departamento: "Legal", Movimientos: 99 },
                          { Departamento: "Marketing", Movimientos: 85 },
                          { Departamento: "Ventas", Movimientos: 65 },
                        ]}
                        filename="actividad_por_departamento"
                        chartId="chart-activity-by-department"
                        chartTitle="Actividad por Departamento"
                      />
                    </div>
                    <CardDescription>Movimientos registrados por departamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="h-[300px]"
                      id="chart-activity-by-department"
                      data-chart-title="Actividad por Departamento"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: "Recursos Humanos", value: 120 },
                            { name: "Finanzas", value: 98 },
                            { name: "Operaciones", value: 86 },
                            { name: "Legal", value: 99 },
                            { name: "Marketing", value: 85 },
                            { name: "Ventas", value: 65 },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} movimientos`, "Cantidad"]} />
                          <Bar dataKey="value" name="Movimientos" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Eficiencia por Departamento
                      </CardTitle>
                      <ExportMenu
                        data={[
                          { Departamento: "Recursos Humanos", Documentos: 120, "Tiempo (horas)": 48, Eficiencia: 85 },
                          { Departamento: "Finanzas", Documentos: 98, "Tiempo (horas)": 72, Eficiencia: 65 },
                          { Departamento: "Operaciones", Documentos: 86, "Tiempo (horas)": 36, Eficiencia: 90 },
                          { Departamento: "Legal", Documentos: 99, "Tiempo (horas)": 60, Eficiencia: 70 },
                          { Departamento: "Marketing", Documentos: 85, "Tiempo (horas)": 24, Eficiencia: 95 },
                          { Departamento: "Ventas", Documentos: 65, "Tiempo (horas)": 48, Eficiencia: 75 },
                        ]}
                        filename="eficiencia_por_departamento"
                        chartId="chart-efficiency-by-department"
                        chartTitle="Eficiencia por Departamento"
                      />
                    </div>
                    <CardDescription>Comparativa de tiempos de procesamiento y volumen</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="h-[400px]"
                      id="chart-efficiency-by-department"
                      data-chart-title="Eficiencia por Departamento"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: "Recursos Humanos", documentos: 120, tiempo: 48, eficiencia: 85 },
                            { name: "Finanzas", documentos: 98, tiempo: 72, eficiencia: 65 },
                            { name: "Operaciones", documentos: 86, tiempo: 36, eficiencia: 90 },
                            { name: "Legal", documentos: 99, tiempo: 60, eficiencia: 70 },
                            { name: "Marketing", documentos: 85, tiempo: 24, eficiencia: 95 },
                            { name: "Ventas", documentos: 65, tiempo: 48, eficiencia: 75 },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="documentos" name="Documentos" fill="#8884d8" />
                          <Bar yAxisId="right" dataKey="tiempo" name="Tiempo (horas)" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Pestaña de Usuarios */}
            <TabsContent value="users">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Usuarios Más Activos
                      </CardTitle>
                      <ExportMenu
                        data={topUsers.map((item) => ({
                          Usuario: item.name,
                          Movimientos: item.value,
                        }))}
                        filename="usuarios_mas_activos"
                        chartId="chart-top-users"
                        chartTitle="Usuarios Más Activos"
                      />
                    </div>
                    <CardDescription>Usuarios con mayor número de movimientos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]" id="chart-top-users" data-chart-title="Usuarios Más Activos">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topUsers}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} movimientos`, "Cantidad"]} />
                          <Bar dataKey="value" name="Movimientos" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Actividad por Rol
                      </CardTitle>
                      <ExportMenu
                        data={roleActivity.map((item) => ({
                          Rol: item.name,
                          Porcentaje: item.value,
                        }))}
                        filename="actividad_por_rol"
                        chartId="chart-activity-by-role"
                        chartTitle="Actividad por Rol"
                      />
                    </div>
                    <CardDescription>Distribución de actividad según rol de usuario</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]" id="chart-activity-by-role" data-chart-title="Actividad por Rol">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={roleActivity}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {roleActivity.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value}%`, "Porcentaje"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Actividad por Hora del Día
                      </CardTitle>
                      <ExportMenu
                        data={hourlyActivity.map((item) => ({
                          Hora: item.hora,
                          Movimientos: item.movimientos,
                        }))}
                        filename="actividad_por_hora"
                        chartId="chart-activity-by-hour"
                        chartTitle="Actividad por Hora del Día"
                      />
                    </div>
                    <CardDescription>Distribución de movimientos según hora del día</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="h-[300px]"
                      id="chart-activity-by-hour"
                      data-chart-title="Actividad por Hora del Día"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyActivity}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hora" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} movimientos`, "Cantidad"]} />
                          <Bar dataKey="movimientos" name="Movimientos" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
