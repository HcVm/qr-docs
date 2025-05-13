"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, FileCheck, FileEdit, FileInput, MapPin, User } from "lucide-react"
import { fetchDocumentByCode, fetchDocumentMovements } from "../actions"

interface DocumentHistoryProps {
  documentId: string
}

export function DocumentHistory({ documentId }: DocumentHistoryProps) {
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMovements = async () => {
      setLoading(true)
      try {
        // Primero obtenemos el documento para tener su ID
        const docResult = await fetchDocumentByCode(documentId)
        if (!docResult.success) {
          setError(docResult.error)
          return
        }

        // Luego obtenemos los movimientos
        const result = await fetchDocumentMovements(docResult.document.id)
        if (result.success) {
          setMovements(result.movements || [])
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError("Error al cargar los movimientos")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (documentId) {
      loadMovements()
    }
  }, [documentId])

  const getActionIcon = (action: string) => {
    switch (action) {
      case "creacion":
        return <FileInput className="h-5 w-5" />
      case "derivado":
        return <FileEdit className="h-5 w-5" />
      case "revision":
        return <FileCheck className="h-5 w-5" />
      case "pendiente":
        return <Clock className="h-5 w-5" />
      default:
        return <FileInput className="h-5 w-5" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "creacion":
        return "bg-green-100 text-green-800"
      case "derivado":
        return "bg-blue-100 text-blue-800"
      case "revision":
        return "bg-yellow-100 text-yellow-800"
      case "pendiente":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      creacion: "Creación",
      derivado: "Derivado",
      revision: "Revisión",
      pendiente: "Pendiente",
    }
    return actionMap[action] || action
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando historial de movimientos...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (movements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No hay movimientos registrados para este documento.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Movimientos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Línea vertical para conectar los eventos */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-6">
            {movements.map((event, index) => (
              <div key={event.id} className="relative flex gap-4">
                <div className={`flex-none rounded-full p-2 ${getActionColor(event.action)}`}>
                  {getActionIcon(event.action)}
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{formatAction(event.action)}</h4>
                    <time className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</time>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.notes}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.to_department?.name || "Departamento"}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {event.user?.full_name || "Usuario"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
