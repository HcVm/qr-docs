"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase"

// Mapeo estandarizado de acciones a estados
const ACTION_TO_STATUS: Record<string, string> = {
  derivado: "en_proceso",
  revision: "pendiente",
  pendiente: "pendiente",
  completado: "completado",
  rechazado: "rechazado",
}

export async function createMovement(formData: FormData) {
  try {
    const supabase = createServerSupabaseClient()

    // Verificar la sesión del usuario
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "No autorizado" }
    }

    // Obtener los datos del formulario
    const documentId = formData.get("documentId") as string
    const fromDepartmentId = formData.get("fromDepartmentId") as string
    const toDepartmentId = formData.get("toDepartmentId") as string
    const action = formData.get("action") as string
    const notes = formData.get("notes") as string

    // Validar datos requeridos
    if (!documentId || !toDepartmentId || !action) {
      return { success: false, error: "Faltan datos requeridos" }
    }

    // Validar que la acción sea válida
    if (!Object.keys(ACTION_TO_STATUS).includes(action)) {
      return { success: false, error: "Acción no válida" }
    }

    // 1. Crear el nuevo movimiento
    const { error: movementError } = await supabase.from("movements").insert({
      document_id: documentId,
      from_department_id: fromDepartmentId,
      to_department_id: toDepartmentId,
      action,
      notes,
      user_id: session.user.id,
    })

    if (movementError) {
      throw movementError
    }

    // 2. Actualizar el estado del documento según la acción
    const newStatus = ACTION_TO_STATUS[action]

    const { error: documentError } = await supabase
      .from("documents")
      .update({
        status: newStatus,
        department_id: toDepartmentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)

    if (documentError) {
      throw documentError
    }

    // Revalidar la página para mostrar los cambios
    revalidatePath(`/dashboard/documents/view/${documentId}`)

    return {
      success: true,
      message: "Movimiento registrado correctamente",
    }
  } catch (error: any) {
    console.error("Error registrando movimiento:", error)
    return {
      success: false,
      error: error.message || "Error al registrar el movimiento",
    }
  }
}
