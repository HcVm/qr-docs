import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileCheck,
  FileEdit,
  FilePlus,
  FileX,
  FileSearch,
  Clock,
  ArrowRightCircle,
  User,
  Building,
  Calendar,
} from "lucide-react"

interface Movement {
  id: string
  action: string
  notes: string
  created_at: string
  from_department?: { id: string; name: string } | null
  to_department?: { id: string; name: string } | null
  user?: { id: string; full_name: string } | null
}

interface MovementTimelineProps {
  movements: Movement[]
}

export function MovementTimeline({ movements }: MovementTimelineProps) {
  if (movements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">No hay movimientos registrados para este documento.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileEdit className="h-5 w-5" />
          Historial de Movimientos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Línea vertical para conectar los eventos */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-8">
            {movements.map((movement, index) => (
              <div key={movement.id} className="relative">
                {/* Conector de línea de tiempo */}
                <div className="absolute left-6 -top-4 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="flex gap-4">
                  {/* Icono de la acción */}
                  <div
                    className={`relative z-10 flex h-12 w-12 flex-none items-center justify-center rounded-full ${getActionBgColor(
                      movement.action,
                    )}`}
                  >
                    {getActionIcon(movement.action)}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col space-y-1 rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
                      {/* Encabezado con acción y fecha */}
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{formatAction(movement.action)}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <time>{formatDate(movement.created_at)}</time>
                        </div>
                      </div>

                      {/* Notas */}
                      {movement.notes && <p className="mt-1 text-sm text-muted-foreground">{movement.notes}</p>}

                      {/* Detalles del movimiento */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {movement.from_department && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            De: {movement.from_department.name}
                          </Badge>
                        )}
                        {movement.to_department && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <ArrowRightCircle className="h-3 w-3" />
                            A: {movement.to_department.name}
                          </Badge>
                        )}
                        {movement.user && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Por: {movement.user.full_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Indicador de tiempo relativo */}
                {index < movements.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 flex h-8 w-0.5 items-center justify-center">
                    <span className="relative left-6 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {getTimeDifference(movement.created_at, movements[index + 1].created_at)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Función para obtener el icono según la acción
function getActionIcon(action: string) {
  switch (action) {
    case "creacion":
      return <FilePlus className="h-6 w-6 text-white" />
    case "derivado":
      return <ArrowRightCircle className="h-6 w-6 text-white" />
    case "revision":
      return <FileSearch className="h-6 w-6 text-white" />
    case "pendiente":
      return <Clock className="h-6 w-6 text-white" />
    case "completado":
      return <FileCheck className="h-6 w-6 text-white" />
    case "rechazado":
      return <FileX className="h-6 w-6 text-white" />
    default:
      return <FileEdit className="h-6 w-6 text-white" />
  }
}

// Función para obtener el color de fondo según la acción
function getActionBgColor(action: string) {
  switch (action) {
    case "creacion":
      return "bg-green-600"
    case "derivado":
      return "bg-blue-600"
    case "revision":
      return "bg-yellow-600"
    case "pendiente":
      return "bg-orange-600"
    case "completado":
      return "bg-emerald-600"
    case "rechazado":
      return "bg-red-600"
    default:
      return "bg-gray-600"
  }
}

// Función para formatear la acción
function formatAction(action: string) {
  const actionMap: Record<string, string> = {
    creacion: "Creación del documento",
    derivado: "Derivado a otro departamento",
    revision: "Enviado a revisión",
    pendiente: "Marcado como pendiente",
    en_proceso: "En proceso",
    completado: "Documento completado",
    rechazado: "Documento rechazado",
  }
  return actionMap[action] || action
}

// Función para formatear la fecha
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("es", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

// Función para calcular la diferencia de tiempo entre dos fechas
function getTimeDifference(dateString1: string, dateString2: string) {
  const date1 = new Date(dateString1)
  const date2 = new Date(dateString2)
  const diffMs = date2.getTime() - date1.getTime()

  // Convertir a minutos
  const diffMins = Math.round(diffMs / 60000)

  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`
  }

  // Convertir a horas
  const diffHours = Math.round(diffMins / 60)

  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hora" : "horas"}`
  }

  // Convertir a días
  const diffDays = Math.round(diffHours / 24)

  if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? "día" : "días"}`
  }

  // Convertir a meses
  const diffMonths = Math.round(diffDays / 30)

  return `${diffMonths} ${diffMonths === 1 ? "mes" : "meses"}`
}
