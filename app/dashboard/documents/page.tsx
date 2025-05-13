"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Eye, FileText, Plus } from "lucide-react"

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
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

      if (error) throw error

      setDocuments(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setLoading(false)
    }
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

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      completado: "Completado",
      en_proceso: "En proceso",
      pendiente: "Pendiente",
      rechazado: "Rechazado",
    }
    return statusMap[status] || status
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documentos</h1>
        <Link href="/dashboard/documents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Documento
          </Button>
        </Link>
      </div>

      {loading ? (
        <p>Cargando documentos...</p>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No hay documentos</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            No se han encontrado documentos en el sistema. Crea uno nuevo para empezar.
          </p>
          <Link href="/dashboard/documents/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Documento
            </Button>
          </Link>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Creado por</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.document_code}</TableCell>
                <TableCell>{doc.title}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(doc.status)}>{formatStatus(doc.status)}</Badge>
                </TableCell>
                <TableCell>{doc.departments ? (doc.departments as any).name : "Sin departamento"}</TableCell>
                <TableCell>{doc.users ? (doc.users as any).full_name : "Usuario"}</TableCell>
                <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/dashboard/documents/view/${doc.id}`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver</span>
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
