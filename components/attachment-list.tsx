"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { FileIcon, FileTextIcon, FileSpreadsheetIcon, DownloadIcon, TrashIcon, ExternalLinkIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteAttachment } from "@/app/actions/attachment"
import { useToast } from "@/hooks/use-toast"

interface AttachmentListProps {
  attachments: any[]
  isLoading: boolean
  onDeleteSuccess?: () => void
}

export function AttachmentList({ attachments, isLoading, onDeleteSuccess }: AttachmentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!deletingId) return

    setIsDeleting(true)
    try {
      const result = await deleteAttachment(deletingId)

      if (result.success) {
        toast({
          title: "Archivo eliminado",
          description: "El archivo ha sido eliminado correctamente",
        })
        if (onDeleteSuccess) {
          onDeleteSuccess()
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo eliminar el archivo",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting attachment:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar el archivo",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setDeletingId(null)
    }
  }

  const confirmDelete = (id: string) => {
    setDeletingId(id)
    setShowDeleteDialog(true)
  }

  const getFileIcon = (fileType: string, fileName: string) => {
    if (fileType.includes("pdf") || fileName.endsWith(".pdf")) {
      return <FileTextIcon className="h-5 w-5 text-red-500" />
    } else if (fileType.includes("word") || fileName.endsWith(".doc") || fileName.endsWith(".docx")) {
      return <FileTextIcon className="h-5 w-5 text-blue-500" />
    } else if (
      fileType.includes("excel") ||
      fileType.includes("spreadsheet") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".xlsx")
    ) {
      return <FileSpreadsheetIcon className="h-5 w-5 text-green-500" />
    }
    return <FileIcon className="h-5 w-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3 border rounded-md">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileIcon className="mx-auto h-12 w-12 mb-3 opacity-50" />
        <p>No hay archivos adjuntos para este documento</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-start gap-3 p-3 border rounded-md hover:bg-muted/30 transition-colors"
          >
            {getFileIcon(attachment.file_type, attachment.file_name)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium truncate">{attachment.file_name}</h4>
                {attachment.is_main_document && (
                  <Badge variant="outline" className="text-xs">
                    Principal
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                {attachment.description && <p className="truncate max-w-full">{attachment.description}</p>}
                <p>{formatFileSize(attachment.file_size)}</p>
                <p>{formatDate(attachment.created_at)}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" asChild>
                <a href={attachment.file_path} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="h-4 w-4" />
                  <span className="sr-only">Ver</span>
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href={attachment.file_path} download={attachment.file_name}>
                  <DownloadIcon className="h-4 w-4" />
                  <span className="sr-only">Descargar</span>
                </a>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => confirmDelete(attachment.id)}>
                <TrashIcon className="h-4 w-4" />
                <span className="sr-only">Eliminar</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El archivo será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600">
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
