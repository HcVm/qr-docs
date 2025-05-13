import { createServerSupabaseClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

// Mapeo estandarizado de acciones a estados
const ACTION_TO_STATUS: Record<string, string> = {
  derivado: "en_proceso",
  revision: "pendiente",
  pendiente: "pendiente",
  completado: "completado",
  rechazado: "rechazado",
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()

    // Verificar la sesión del usuario
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    // Obtener los datos del movimiento
    const { documentId, fromDepartmentId, toDepartmentId, action, notes } = await request.json()

    // Validar datos requeridos
    if (!documentId || !toDepartmentId || !action) {
      return NextResponse.json({ success: false, error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Validar que la acción sea válida
    if (!Object.keys(ACTION_TO_STATUS).includes(action)) {
      return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 400 })
    }

    // 1. Crear el nuevo movimiento
    const { data: movementData, error: movementError } = await supabase
      .from("movements")
      .insert({
        document_id: documentId,
        from_department_id: fromDepartmentId,
        to_department_id: toDepartmentId,
        action,
        notes,
        user_id: session.user.id,
      })
      .select()

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

    return NextResponse.json({
      success: true,
      message: "Movimiento registrado correctamente",
      movement: movementData?.[0] || null,
    })
  } catch (error: any) {
    console.error("Error registrando movimiento:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al registrar el movimiento",
      },
      { status: 500 },
    )
  }
}
