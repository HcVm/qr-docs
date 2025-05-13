"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider"
import { ArrowRightCircle, FileCheck, FileX, FileSearch, Clock } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface Department {
  id: string
  name: string
}

interface MovementFormProps {
  documentId: string
  documentCode: string
  currentDepartmentId: string
  departments: Department[]
  onSuccess?: () => void
}

// Definición de acciones estandarizadas
const ACTIONS = [
  {
    value: "derivado",
    label: "Derivar a otro departamento",
    icon: <ArrowRightCircle className="mr-2 h-4 w-4" />,
    requiresDepartment: true,
  },
  {
    value: "revision",
    label: "Enviar a revisión",
    icon: <FileSearch className="mr-2 h-4 w-4" />,
    requiresDepartment: true,
  },
  {
    value: "pendiente",
    label: "Marcar como pendiente",
    icon: <Clock className="mr-2 h-4 w-4" />,
    requiresDepartment: false,
  },
  {
    value: "completado",
    label: "Marcar como completado",
    icon: <FileCheck className="mr-2 h-4 w-4" />,
    requiresDepartment: false,
  },
  {
    value: "rechazado",
    label: "Rechazar documento",
    icon: <FileX className="mr-2 h-4 w-4" />,
    requiresDepartment: false,
  },
]

// Mapeo de acciones a estados
const ACTION_TO_STATUS: Record<string, string> = {
  derivado: "en_proceso",
  revision: "pendiente",
  pendiente: "pendiente",
  completado: "completado",
  rechazado: "rechazado",
}

export function MovementForm({
  documentId,
  documentCode,
  currentDepartmentId,
  departments,
  onSuccess,
}: MovementFormProps) {
  const [toDepartmentId, setToDepartmentId] = useState("")
  const [action, setAction] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { session } = useAuth()
  const supabase = createClientSupabaseClient()

  // Añadir estado para el departamento del usuario actual
  const [userDepartment, setUserDepartment] = useState<string | null>(null)
  const [canCreateMovement, setCanCreateMovement] = useState(false)
  const supabaseComponent = createClientComponentClient()

  const fetchUserDepartment = useCallback(async () => {
    if (!session?.user?.id) return

    const { data, error } = await supabaseComponent
      .from("users")
      .select("department_id")
      .eq("id", session.user.id)
      .single()

    if (error) {
      console.error("Error fetching user department:", error)
      return
    }

    setUserDepartment(data.department_id)

    // Verificar si el usuario puede crear un movimiento
    // (si pertenece al departamento actual del documento)
    setCanCreateMovement(data.department_id === currentDepartmentId)
  }, [session, currentDepartmentId, supabaseComponent])

  // Añadir useEffect para obtener el departamento del usuario actual
  useEffect(() => {
    fetchUserDepartment()
  }, [fetchUserDepartment])

  // Obtener la acción seleccionada
  const selectedAction = ACTIONS.find((a) => a.value === action)
  const requiresDepartment = selectedAction?.requiresDepartment || false

  if (!departments) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registrar Movimiento</CardTitle>
          <CardDescription>No se pudieron cargar los departamentos</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-600">Por favor, recarga la página o contacta al administrador.</p>
        </CardContent>
      </Card>
    )
  }

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registrar Movimiento</CardTitle>
          <CardDescription>Debes iniciar sesión para registrar movimientos</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!canCreateMovement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registrar Movimiento</CardTitle>
          <CardDescription>
            No puedes registrar un movimiento para este documento porque no perteneces al departamento actual del
            documento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-600">
            Solo los usuarios del departamento actual pueden derivar o procesar este documento.
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session?.user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para realizar esta acción",
        variant: "destructive",
      })
      return
    }

    if (!action) {
      toast({
        title: "Error",
        description: "Por favor selecciona una acción",
        variant: "destructive",
      })
      return
    }

    if (requiresDepartment && !toDepartmentId) {
      toast({
        title: "Error",
        description: "Por favor selecciona un departamento destino",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Determinar el departamento destino
      const finalToDepartmentId = requiresDepartment ? toDepartmentId : currentDepartmentId

      // 1. Crear el nuevo movimiento
      const { error: movementError } = await supabase.from("movements").insert({
        document_id: documentId,
        from_department_id: currentDepartmentId,
        to_department_id: finalToDepartmentId,
        action,
        notes,
        user_id: session.user.id,
      })

      if (movementError) throw movementError

      // 2. Actualizar el estado del documento según la acción
      const newStatus = ACTION_TO_STATUS[action] || "en_proceso"

      const { error: documentError } = await supabase
        .from("documents")
        .update({
          status: newStatus,
          department_id: finalToDepartmentId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)

      if (documentError) throw documentError

      toast({
        title: "Movimiento registrado",
        description: `El documento ${documentCode} ha sido ${getActionText(action)}`,
      })

      // Limpiar el formulario
      setToDepartmentId("")
      setAction("")
      setNotes("")

      // Actualizar la UI
      if (onSuccess) {
        onSuccess()
      }

      // Refrescar la página para mostrar el nuevo movimiento
      router.refresh()
    } catch (error: any) {
      console.error("Error registrando movimiento:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el movimiento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getActionText = (action: string) => {
    switch (action) {
      case "derivado":
        return "derivado al departamento seleccionado"
      case "revision":
        return "enviado a revisión"
      case "pendiente":
        return "marcado como pendiente"
      case "completado":
        return "marcado como completado"
      case "rechazado":
        return "rechazado"
      default:
        return "actualizado"
    }
  }

  // Filtrar el departamento actual de las opciones
  const availableDepartments = departments ? departments.filter((dept) => dept.id !== currentDepartmentId) : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Movimiento</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="action" className="text-sm font-medium">
              Acción <span className="text-red-500">*</span>
            </label>
            <Select value={action} onValueChange={setAction} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar acción" />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((actionOption) => (
                  <SelectItem key={actionOption.value} value={actionOption.value}>
                    <div className="flex items-center">
                      {actionOption.icon}
                      {actionOption.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiresDepartment && (
            <div className="space-y-2">
              <label htmlFor="toDepartment" className="text-sm font-medium">
                Departamento Destino <span className="text-red-500">*</span>
              </label>
              <Select value={toDepartmentId} onValueChange={setToDepartmentId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  {availableDepartments.length > 0 ? (
                    availableDepartments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No hay otros departamentos disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notas o Comentarios
            </label>
            <Textarea
              id="notes"
              placeholder="Añade notas o comentarios sobre este movimiento"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={loading || !action || (requiresDepartment && !toDepartmentId)}>
            {loading ? "Procesando..." : "Registrar Movimiento"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
