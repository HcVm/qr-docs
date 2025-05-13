"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { generateDocumentQR } from "@/lib/qr-utils"
import { useAuth } from "@/components/auth-provider"

// Añadir la importación para el componente de carga de archivos
import { FileUpload } from "@/components/file-upload"
import { uploadDocumentAttachment } from "@/app/actions/attachment"

// Estados estandarizados del documento
const DOCUMENT_STATUSES = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_proceso", label: "En proceso" },
  { value: "completado", label: "Completado" },
  { value: "rechazado", label: "Rechazado" },
]

interface Department {
  id: string
  name: string
}

interface User {
  id: string
  email: string
  full_name?: string
}

interface Document {
  id: string
  title: string
  description: string
  status: string
  department_id: string
  created_by: User
  document_code: string
  departments: Department
}

interface DocumentFormProps {
  document: Document | null
  departments: Department[]
  isNew: boolean
}

export function DocumentForm({ document, departments, isNew }: DocumentFormProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { session, loading } = useAuth()

  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: document?.title || "",
    description: document?.description || "",
    department_id: document?.department_id || "",
    status: document?.status || "pendiente",
  })

  // Añadir estado para el archivo principal
  const [mainFile, setMainFile] = useState<File | null>(null)
  const [fileDescription, setFileDescription] = useState("")
  const [fileUploading, setFileUploading] = useState(false)

  // Verificar la sesión al cargar el componente
  useEffect(() => {
    if (!loading && !session) {
      toast({
        title: "Sesión no válida",
        description: "Debes iniciar sesión para acceder a esta página",
        variant: "destructive",
      })
      router.push("/auth/login")
    }
  }, [session, loading, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Modificar la función handleSubmit para incluir la carga del archivo
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      // Verificar si el usuario está autenticado
      if (!session?.user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para realizar esta acción",
          variant: "destructive",
        })
        setFormLoading(false)
        return
      }

      const userId = session.user.id

      if (isNew) {
        // Generar código único para el documento
        const documentCode = await generateDocumentQR()

        const { data, error } = await supabase
          .from("documents")
          .insert({
            ...formData,
            created_by: userId,
            document_code: documentCode,
          })
          .select()

        if (error) {
          throw error
        }

        // Crear el primer movimiento (creación)
        if (data && data[0]) {
          const { error: movementError } = await supabase.from("movements").insert({
            document_id: data[0].id,
            from_department_id: null,
            to_department_id: formData.department_id,
            action: "creacion",
            notes: "Documento creado en el sistema",
            user_id: userId,
          })

          if (movementError) {
            console.error("Error creating initial movement:", movementError)
          }

          // Subir el archivo principal si existe
          if (mainFile && data[0].id) {
            setFileUploading(true)

            const formData = new FormData()
            formData.append("file", mainFile)
            formData.append("documentId", data[0].id)
            formData.append("description", fileDescription)
            formData.append("isMainDocument", "true")

            const uploadResult = await uploadDocumentAttachment(formData)

            if (!uploadResult.success) {
              console.error("Error uploading main file:", uploadResult.error)
              toast({
                title: "Advertencia",
                description: "El documento se creó pero hubo un problema al subir el archivo adjunto",
                variant: "default",
              })
            }
          }
        }

        toast({
          title: "Documento creado",
          description: "El documento ha sido creado exitosamente",
        })

        // Redirigir a la página del documento recién creado
        if (data && data[0]) {
          router.push(`/dashboard/documents/view/${data[0].id}`)
        } else {
          router.push("/dashboard/documents")
        }
      } else {
        const { error } = await supabase.from("documents").update(formData).eq("id", document?.id)

        if (error) {
          throw error
        }

        // Subir el archivo principal si existe
        if (mainFile && document?.id) {
          setFileUploading(true)

          const formData = new FormData()
          formData.append("file", mainFile)
          formData.append("documentId", document.id)
          formData.append("description", fileDescription)
          formData.append("isMainDocument", "true")

          const uploadResult = await uploadDocumentAttachment(formData)

          if (!uploadResult.success) {
            console.error("Error uploading main file:", uploadResult.error)
            toast({
              title: "Advertencia",
              description: "El documento se actualizó pero hubo un problema al subir el archivo adjunto",
              variant: "default",
            })
          }
        }

        toast({
          title: "Documento actualizado",
          description: "El documento ha sido actualizado exitosamente",
        })

        router.push(`/dashboard/documents/view/${document?.id}`)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ha ocurrido un error al procesar el documento",
        variant: "destructive",
      })
    } finally {
      setFormLoading(false)
      setFileUploading(false)
    }
  }

  // Si estamos cargando o no hay sesión, mostramos un indicador de carga
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </CardContent>
      </Card>
    )
  }

  // Si no hay sesión después de cargar, no renderizamos el formulario
  if (!session) {
    return null
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Título
            </label>
            <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Descripción
            </label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="department" className="text-sm font-medium">
              Departamento
            </label>
            <Select
              value={formData.department_id}
              onValueChange={(value) => handleSelectChange("department_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar departamento" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isNew && (
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Estado
              </label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Nota: Cambiar el estado aquí solo afecta al documento. Para registrar un movimiento, usa el formulario
                de movimientos.
              </p>
            </div>
          )}

          {isNew && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Documento principal (opcional)</label>
              <FileUpload
                onUpload={async (file, description, isMainDocument) => {
                  setMainFile(file)
                  setFileDescription(description)
                  toast({
                    title: "Archivo seleccionado",
                    description: "El archivo se subirá al crear el documento",
                  })
                }}
                allowMainDocument={false}
                maxSizeMB={10}
                acceptedFileTypes={[
                  ".pdf",
                  ".doc",
                  ".docx",
                  ".xls",
                  ".xlsx",
                  "application/pdf",
                  "application/msword",
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  "application/vnd.ms-excel",
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ]}
              />
              {mainFile && <p className="text-sm text-green-600">Archivo seleccionado: {mainFile.name}</p>}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                document ? router.push(`/dashboard/documents/view/${document.id}`) : router.push("/dashboard/documents")
              }
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? "Procesando..." : isNew ? "Crear Documento" : "Actualizar Documento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
