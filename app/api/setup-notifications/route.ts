import { createServerSupabaseClient } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Verificar si la tabla ya existe
    const { error: checkError } = await supabase.from("notifications").select("id").limit(1).maybeSingle()

    if (checkError) {
      return NextResponse.json({
        success: false,
        error: "Error al verificar la tabla de notificaciones",
        details: checkError.message,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Sistema de notificaciones configurado correctamente",
    })
  } catch (error: any) {
    console.error("Error setting up notifications:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al configurar notificaciones",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
