"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { uploadAttachment } from "@/app/actions/attachment"
import { FileIcon, UploadIcon, XIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface FileUploadProps {
  documentId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function FileUpload({ documentId, onSuccess, onCancel }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [isMainDocument, setIsMainDocument] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // Validar el tamaño del archivo (máximo 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (selectedFile.size > maxSize) {
        setError("El archivo excede el tamaño máximo permitido (5MB)")
        return
      }

      // Validar el tipo de archivo
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ]

      // Verificar por extensión también para manejar tipos MIME incorrectos
      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase()
      const allowedExtensions = ["pdf", "doc", "docx", "xls", "xlsx"]

      if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(fileExtension || "")) {
        setError("Tipo de archivo no permitido. Solo se permiten PDF, Word y Excel")
        return
      }

      setFile(selectedFile)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError("Por favor, selecciona un archivo")
      return
    }

    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("documentId", documentId)
    formData.append("description", description)
    formData.append("isMainDocument", isMainDocument.toString())

    try {
      const result = await uploadAttachment(formData)

      if (result.success) {
        toast({
          title: "Archivo subido correctamente",
          description: "El archivo ha sido adjuntado al documento",
          variant: "default",
        })

        // Limpiar el formulario
        setFile(null)
        setDescription("")
        setIsMainDocument(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }

        // Llamar al callback de éxito si existe
        if (onSuccess) {
          onSuccess()
        }
      } else {
        setError(result.error || "Error al subir el archivo")
        toast({
          title: "Error",
          description: result.error || "Error al subir el archivo",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error al subir el archivo:", err)
      setError("Error al procesar la solicitud")
      toast({
        title: "Error",
        description: "Error al procesar la solicitud",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Archivo</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            id="file"
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
          />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
            <UploadIcon className="mr-2 h-4 w-4" />
            {file ? "Cambiar archivo" : "Seleccionar archivo"}
          </Button>
          {file && (
            <Button type="button" variant="ghost" size="icon" onClick={clearFile} className="h-9 w-9">
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
        {file && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <FileIcon className="h-4 w-4" />
            <span className="truncate">{file.name}</span>
            <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Formatos permitidos: PDF, Word, Excel. Tamaño máximo: 5MB</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Añade una descripción para este archivo"
          rows={2}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isMainDocument"
          checked={isMainDocument}
          onCheckedChange={(checked) => setIsMainDocument(checked === true)}
        />
        <Label htmlFor="isMainDocument" className="text-sm font-normal">
          Establecer como documento principal
        </Label>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={!file || isUploading}>
          {isUploading ? "Subiendo..." : "Subir archivo"}
        </Button>
      </div>
    </form>
  )
}
