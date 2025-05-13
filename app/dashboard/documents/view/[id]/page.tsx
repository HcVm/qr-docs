import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MovementForm } from "@/components/movement-form"
import {
  ArrowLeft,
  FileText,
  Pencil,
  Printer,
  FileCheck,
  FileX,
  Clock,
  ArrowRightCircle,
  FilePlus,
  FileSearch,
} from "lucide-react"

// Importar el componente de adjuntos
import { DocumentAttachments } from "@/components/document-attachments"

// Función para obtener los departamentos
async function fetchDepartments() {
  const supabase = createServerComponentClient({ cookies })
  const { data: departments, error } = await supabase.from("departments").select("*").order("name", { ascending: true })

  if (error) {
    console.error("Error fetching departments:", error)
    return []
  }

  return departments || []
}

// Función para obtener los datos del documento
async function fetchDocumentData(id: string) {
  const supabase = createServerComponentClient({ cookies })

  // Obtener el documento
  const { data: document, error } = await supabase
    .from("documents")
    .select(`
      *,
      departments:department_id(*),
      users:created_by(*)
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching document:", error)
    return { document: null, movements: [], attachments: [] }
  }

  // Obtener los movimientos
  const { data: movements, error: movementsError } = await supabase
    .from("movements")
    .select(`
      *,
      from_department:from_department_id(*),
      to_department:to_department_id(*),
      user:user_id(*)
    `)
    .eq("document_id", id)
    .order("created_at", { ascending: true })

  if (movementsError) {
    console.error("Error fetching movements:", movementsError)
  }

  // Intentar obtener los adjuntos si la tabla existe
  let attachments = []
  try {
    const { data: attachmentsData, error: attachmentsError } = await supabase
      .from("attachments")
      .select("*")
      .eq("document_id", id)
      .order("created_at", { ascending: false })

    if (!attachmentsError) {
      attachments = attachmentsData || []
    } else if (!attachmentsError.message.includes("does not exist")) {
      console.error("Error fetching attachments:", attachmentsError)
    }
  } catch (error) {
    console.error("Error in attachments query:", error)
  }

  return {
    document,
    movements: movements || [],
    attachments,
  }
}

// Componente principal
export default async function DocumentViewPage({ params }: { params: { id: string } }) {
  const { document, movements, attachments } = await fetchDocumentData(params.id)
  const departments = await fetchDepartments()

  if (!document) {
    notFound()
  }

  // Estados estandarizados del documento
  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      pendiente: "Pendiente",
      en_proceso: "En proceso",
      completado: "Completado",
      rechazado: "Rechazado",
      active: "Activo",
      archived: "Archivado",
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completado":
      case "active":
        return "bg-green-500"
      case "en_proceso":
        return "bg-blue-500"
      case "pendiente":
        return "bg-yellow-500"
      case "rechazado":
      case "archived":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  // Acciones estandarizadas de movimientos
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

  // Verificar si el documento está en un estado que permite movimientos
  const canAddMovement = !["completado", "rechazado", "archived"].includes(document.status)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/documents">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Detalles del Documento</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/documents/report/${params.id}`}>
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Generar Reporte
            </Button>
          </Link>
          <Link href={`/dashboard/documents/${params.id}`}>
            <Button>
              <Pencil className="mr-2 h-4 w-4" />
              Editar Documento
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span>{document.title}</span>
                </div>
                <Badge className={getStatusColor(document.status)}>{formatStatus(document.status)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Código</h3>
                    <p>{document.document_code}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Departamento</h3>
                    <p>{document.departments ? document.departments.name : "Sin departamento"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Creado por</h3>
                    <p>{document.users ? document.users.full_name : "Usuario"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Fecha de creación</h3>
                    <p>{new Date(document.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {document.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Descripción</h3>
                    <p>{document.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <DocumentAttachments documentId={document.id} initialAttachments={attachments} />

          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-center text-muted-foreground">No hay movimientos registrados para este documento.</p>
              ) : (
                <div className="relative">
                  {/* Línea vertical para conectar los eventos */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                  <div className="space-y-6">
                    {movements.map((event) => (
                      <div key={event.id} className="relative flex gap-4">
                        <div className={`flex-none rounded-full p-2 ${getActionColor(event.action)}`}>
                          {getActionIcon(event.action)}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{formatAction(event.action)}</h4>
                            <time className="text-xs text-muted-foreground">
                              {new Date(event.created_at).toLocaleString()}
                            </time>
                          </div>
                          <p className="text-sm text-muted-foreground">{event.notes}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              De: {event.from_department ? event.from_department.name : "Origen"}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              A: {event.to_department ? event.to_department.name : "Destino"}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              Por: {event.user ? event.user.full_name : "Usuario"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          {canAddMovement ? (
            <MovementForm
              documentId={document.id}
              documentCode={document.document_code}
              currentDepartmentId={document.department_id}
              departments={departments}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Documento Finalizado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Este documento está {formatStatus(document.status).toLowerCase()} y no permite registrar nuevos
                  movimientos.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// Función para obtener el color según la acción
function getActionColor(action: string) {
  switch (action) {
    case "creacion":
      return "bg-green-100 text-green-800"
    case "derivado":
      return "bg-blue-100 text-blue-800"
    case "revision":
      return "bg-yellow-100 text-yellow-800"
    case "pendiente":
      return "bg-orange-100 text-orange-800"
    case "completado":
      return "bg-green-100 text-green-800"
    case "rechazado":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

// Función para obtener el icono según la acción
function getActionIcon(action: string) {
  switch (action) {
    case "creacion":
      return <FilePlus className="h-5 w-5" />
    case "derivado":
      return <ArrowRightCircle className="h-5 w-5" />
    case "revision":
      return <FileSearch className="h-5 w-5" />
    case "pendiente":
      return <Clock className="h-5 w-5" />
    case "completado":
      return <FileCheck className="h-5 w-5" />
    case "rechazado":
      return <FileX className="h-5 w-5" />
    default:
      return <FileText className="h-5 w-5" />
  }
}
