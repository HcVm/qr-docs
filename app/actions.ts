"use server"

import { revalidatePath } from "next/cache"
import {
  getDocumentByCode,
  getDocumentMovements,
  createDocument,
  createMovement,
  getDepartments,
  getUsers,
} from "@/lib/document-service"

export async function fetchDocumentByCode(documentCode: string) {
  const { document, error } = await getDocumentByCode(documentCode)

  if (error) {
    return { success: false, error: error.message }
  }

  if (!document) {
    return { success: false, error: "Documento no encontrado" }
  }

  return { success: true, document }
}

export async function fetchDocumentMovements(documentId: string) {
  const { movements, error } = await getDocumentMovements(documentId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, movements }
}

export async function generateDocumentQR(formData: FormData) {
  const title = formData.get("title") as string
  const documentCode = formData.get("documentCode") as string
  const description = formData.get("description") as string
  const departmentId = formData.get("departmentId") as string
  const userId = formData.get("userId") as string

  if (!title || !documentCode || !departmentId || !userId) {
    return { success: false, error: "Todos los campos son requeridos" }
  }

  try {
    // Crear el documento
    const { document, error: docError } = await createDocument({
      document_code: documentCode,
      title,
      description,
      status: "pendiente",
      created_by: userId,
      department_id: departmentId,
    })

    if (docError) {
      return { success: false, error: docError.message }
    }

    if (!document) {
      return { success: false, error: "No se pudo crear el documento" }
    }

    // Crear el primer movimiento
    const { error: movError } = await createMovement({
      document_id: document.id,
      from_department_id: null,
      to_department_id: departmentId,
      action: "creacion",
      notes: "Documento creado en el sistema",
      user_id: userId,
    })

    if (movError) {
      return { success: false, error: movError.message }
    }

    revalidatePath("/")
    return { success: true, documentCode }
  } catch (error: any) {
    console.error("Error in generateDocumentQR:", error)
    return { success: false, error: error.message || "Error al generar el código QR" }
  }
}

export async function fetchDepartments() {
  const { departments, error } = await getDepartments()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, departments }
}

export async function fetchUsers() {
  const { users, error } = await getUsers()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, users }
}
