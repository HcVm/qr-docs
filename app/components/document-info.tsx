"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, User, Calendar, Building } from "lucide-react"
import { fetchDocumentByCode } from "../actions"
import type { Document, User as UserType } from "@/lib/supabase"

interface DocumentInfoProps {
  documentId: string
}

export function DocumentInfo({ documentId }: DocumentInfoProps) {
  const [document, setDocument] = useState<Document | null>(null)
  const [creator, setCreator] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true)
      try {
        const result = await fetchDocumentByCode(documentId)
        if (result.success) {
          setDocument(result.document)
          // En una aplicación real, aquí cargaríamos también los datos del creador
          // por ahora simulamos esto
          setCreator({
            id: result.document.created_by,
            full_name: "Usuario del Sistema",
            email: "usuario@ejemplo.com",
            department_id: result.document.department_id,
            role: "user",
            created_at: "",
            updated_at: "",
          })
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError("Error al cargar el documento")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (documentId) {
      loadDocument()
    }
  }, [documentId])

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

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      completado: "Completado",
      en_proceso: "En proceso",
      pendiente: "Pendiente",
      rechazado: "Rechazado",
    }
    return statusMap[status] || status
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Cargando información del documento...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error || !document) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error || "No se pudo cargar la información del documento"}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>{document.title}</span>
          <Badge className={getStatusColor(document.status)}>{formatStatus(document.status)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">ID:</span>
            <span className="text-sm font-medium">{document.document_code}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Creado por:</span>
            <span className="text-sm font-medium">{creator?.full_name || "Usuario del Sistema"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Fecha:</span>
            <span className="text-sm font-medium">{new Date(document.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Departamento:</span>
            <span className="text-sm font-medium">Departamento asignado</span>
          </div>
        </div>
        {document.description && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Descripción:</p>
            <p className="text-sm">{document.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
