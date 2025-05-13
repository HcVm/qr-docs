"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createClientSupabaseClient } from "@/lib/supabase"
import { ArrowLeft, Download, FileText, Printer } from "lucide-react"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

export default function DocumentReportPage({ params }: { params: { id: string } }) {
  const [document, setDocument] = useState<any>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchDocumentData()
  }, [params.id])

  const fetchDocumentData = async () => {
    setLoading(true)
    try {
      // Obtener documento
      const { data: docData, error: docError } = await supabase
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
        .eq("id", params.id)
        .single()

      if (docError) throw docError

      setDocument(docData)

      // Obtener movimientos
      const { data: movData, error: movError } = await supabase
        .from("movements")
        .select(`
          *,
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
        .eq("document_id", params.id)
        .order("created_at", { ascending: true })

      if (movError) throw movError

      setMovements(movData || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cargar la información del documento",
        variant: "destructive",
      })
      console.error(error)
      router.push("/dashboard/documents")
    } finally {
      setLoading(false)
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

  const generatePDF = () => {
    if (!document) return

    try {
      // @ts-ignore
      const doc = new jsPDF()

      // Título
      doc.setFontSize(18)
      doc.text("Reporte de Documento", 105, 15, { align: "center" })

      // Información del documento
      doc.setFontSize(12)
      doc.text(`Código: ${document.document_code}`, 14, 30)
      doc.text(`Título: ${document.title}`, 14, 38)
      doc.text(`Estado: ${formatStatus(document.status)}`, 14, 46)
      doc.text(`Departamento: ${document.departments ? document.departments.name : "Sin departamento"}`, 14, 54)
      doc.text(`Creado por: ${document.users ? document.users.full_name : "Usuario"}`, 14, 62)
      doc.text(`Fecha de creación: ${new Date(document.created_at).toLocaleString()}`, 14, 70)

      if (document.description) {
        doc.text("Descripción:", 14, 78)
        doc.setFontSize(10)
        const splitDescription = doc.splitTextToSize(document.description, 180)
        doc.text(splitDescription, 14, 86)
      }

      // Historial de movimientos
      const startY = document.description ? 100 : 80
      doc.setFontSize(14)
      doc.text("Historial de Movimientos", 105, startY, { align: "center" })

      if (movements.length > 0) {
        const tableColumn = ["Fecha", "Acción", "De", "A", "Usuario", "Notas"]
        const tableRows = movements.map((mov) => [
          new Date(mov.created_at).toLocaleString(),
          formatAction(mov.action),
          mov.from_department ? mov.from_department.name : "-",
          mov.to_department ? mov.to_department.name : "-",
          mov.user ? mov.user.full_name : "Usuario",
          mov.notes || "-",
        ])

        // @ts-ignore
        doc.autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: startY + 10,
          theme: "grid",
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 20 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 30 },
            5: { cellWidth: 50 },
          },
        })
      } else {
        doc.setFontSize(10)
        doc.text("No hay movimientos registrados para este documento.", 105, startY + 20, { align: "center" })
      }

      // Pie de página
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(
          `Página ${i} de ${pageCount} - Generado el ${new Date().toLocaleString()}`,
          105,
          doc.internal.pageSize.height - 10,
          { align: "center" },
        )
      }

      // Guardar PDF
      doc.save(`reporte_${document.document_code}.pdf`)

      toast({
        title: "Reporte generado",
        description: "El reporte ha sido generado correctamente",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el reporte",
        variant: "destructive",
      })
    }
  }

  const printReport = () => {
    window.print()
  }

  if (loading) {
    return <p>Cargando información del documento...</p>
  }

  if (!document) {
    return <p>Documento no encontrado</p>
  }

  return (
    <div className="print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Reporte de Documento</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printReport}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={generatePDF}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="space-y-6 print:space-y-4">
        <Card className="print:border-none print:shadow-none">
          <CardHeader className="print:pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>{document.title}</span>
              </div>
              <Badge>{formatStatus(document.status)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 print:space-y-2">
              <div className="grid grid-cols-2 gap-4 print:gap-2">
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

        <Card className="print:border-none print:shadow-none">
          <CardHeader className="print:pb-2">
            <CardTitle>Historial de Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="text-center text-muted-foreground">No hay movimientos registrados para este documento.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left text-sm font-medium">Fecha</th>
                      <th className="py-2 text-left text-sm font-medium">Acción</th>
                      <th className="py-2 text-left text-sm font-medium">De</th>
                      <th className="py-2 text-left text-sm font-medium">A</th>
                      <th className="py-2 text-left text-sm font-medium">Usuario</th>
                      <th className="py-2 text-left text-sm font-medium">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((mov) => (
                      <tr key={mov.id} className="border-b">
                        <td className="py-2 text-sm">{new Date(mov.created_at).toLocaleString()}</td>
                        <td className="py-2 text-sm">{formatAction(mov.action)}</td>
                        <td className="py-2 text-sm">{mov.from_department ? mov.from_department.name : "-"}</td>
                        <td className="py-2 text-sm">{mov.to_department ? mov.to_department.name : "-"}</td>
                        <td className="py-2 text-sm">{mov.user ? mov.user.full_name : "Usuario"}</td>
                        <td className="py-2 text-sm">{mov.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
