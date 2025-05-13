"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUpload } from "@/components/file-upload"
import { AttachmentList } from "@/components/attachment-list"
import { PlusIcon, RefreshCwIcon as RefreshIcon } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface DocumentAttachmentsProps {
  documentId: string
  initialAttachments?: any[]
}

export function DocumentAttachments({ documentId, initialAttachments = [] }: DocumentAttachmentsProps) {
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [attachments, setAttachments] = useState<any[]>(initialAttachments)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  const fetchAttachments = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching attachments:", error)
        if (!error.message.includes("does not exist")) {
          toast({
            title: "Error",
            description: "No se pudieron cargar los archivos adjuntos",
            variant: "destructive",
          })
        }
      } else {
        setAttachments(data || [])
      }
    } catch (error) {
      console.error("Error in fetchAttachments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Suscribirse a cambios en la tabla de adjuntos
  useEffect(() => {
    const channel = supabase
      .channel("attachments_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attachments",
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          console.log("Cambio en attachments:", payload)
          fetchAttachments()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [documentId, supabase])

  const handleUploadSuccess = () => {
    setShowUploadForm(false)
    fetchAttachments()
    toast({
      title: "Archivo subido",
      description: "El archivo se ha subido correctamente",
    })
  }

  const handleDeleteSuccess = () => {
    fetchAttachments()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Archivos Adjuntos</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAttachments} disabled={isLoading}>
            <RefreshIcon className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
          {!showUploadForm && (
            <Button size="sm" onClick={() => setShowUploadForm(true)}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Añadir Archivo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showUploadForm ? (
          <div className="mb-4">
            <FileUpload
              documentId={documentId}
              onSuccess={handleUploadSuccess}
              onCancel={() => setShowUploadForm(false)}
            />
          </div>
        ) : null}

        <AttachmentList attachments={attachments} isLoading={isLoading} onDeleteSuccess={handleDeleteSuccess} />
      </CardContent>
    </Card>
  )
}
