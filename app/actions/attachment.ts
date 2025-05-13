"use server"
import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase"

// Nombre del bucket a utilizar
const STORAGE_BUCKET = "attachments"

export async function uploadAttachment(formData: FormData) {
  try {
    const supabase = createServerSupabaseClient()

    // Verificar si la tabla attachments existe
    const { error: tableCheckError } = await supabase.from("attachments").select("id").limit(1).maybeSingle()

    // Si la tabla no existe, devolver un mensaje de error amigable
    if (tableCheckError && tableCheckError.message.includes("does not exist")) {
      return {
        success: false,
        error: "La funcionalidad de archivos adjuntos aún no está disponible. Por favor, contacta al administrador.",
      }
    }

    // Obtener datos del formulario
    const file = formData.get("file") as File
    const documentId = formData.get("documentId") as string
    const description = formData.get("description") as string
    const isMainDocument = formData.get("isMainDocument") === "true"

    if (!file || !documentId) {
      return { success: false, error: "Faltan datos requeridos" }
    }

    // Obtener el usuario actual
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !sessionData.session) {
      console.error("Error al obtener la sesión:", sessionError)
      return { success: false, error: "Usuario no autenticado" }
    }

    const userId = sessionData.session.user.id

    // Generar un nombre de archivo único
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = `${documentId}/${timestamp}.${fileExtension}`

    // Intentar subir el archivo usando el cliente de servicio (con más permisos)
    try {
      // Subir el archivo al bucket de storage
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, file)

      if (uploadError) {
        console.error("Error al subir el archivo:", uploadError)

        // Manejar diferentes tipos de errores
        if (uploadError.message.includes("Bucket not found")) {
          return {
            success: false,
            error:
              "El almacenamiento para archivos no está configurado. El administrador debe crear un bucket llamado 'attachments' en Supabase Storage.",
          }
        } else if (uploadError.message.includes("row-level security policy")) {
          return {
            success: false,
            error:
              "No tienes permisos para subir archivos. El administrador debe configurar las políticas de seguridad en Supabase Storage.",
          }
        }

        return {
          success: false,
          error:
            "Error al subir el archivo. Asegúrate de que el archivo no exceda los 5MB y sea de un formato permitido (PDF, Word, Excel).",
        }
      }

      // Obtener la URL pública del archivo
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName)

      // Crear el registro en la tabla de attachments
      const { data: attachment, error: insertError } = await supabase
        .from("attachments")
        .insert({
          document_id: documentId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: urlData.publicUrl,
          uploaded_by: userId,
          description: description || null,
          is_main_document: isMainDocument,
        })
        .select()
        .single()

      if (insertError) {
        console.error("Error al guardar el registro del archivo:", insertError)

        // Manejar error de políticas de seguridad en la tabla
        if (insertError.message.includes("row-level security policy")) {
          return {
            success: false,
            error:
              "No tienes permisos para guardar información de archivos. El administrador debe configurar las políticas de seguridad en la tabla 'attachments'.",
          }
        }

        return { success: false, error: "Error al guardar la información del archivo: " + insertError.message }
      }

      // Actualizar el documento para indicar que tiene archivos adjuntos
      await supabase.from("documents").update({ has_attachments: true }).eq("id", documentId)

      revalidatePath(`/dashboard/documents/view/${documentId}`)

      return { success: true, attachment }
    } catch (uploadError: any) {
      console.error("Error en el proceso de carga:", uploadError)
      return {
        success: false,
        error: "Error al procesar la carga del archivo: " + (uploadError.message || uploadError),
      }
    }
  } catch (error: any) {
    console.error("Error en uploadAttachment:", error)
    return { success: false, error: "Error al procesar la solicitud: " + (error.message || error) }
  }
}

export async function deleteAttachment(attachmentId: string) {
  try {
    const supabase = createServerSupabaseClient()

    // Obtener información del archivo antes de eliminarlo
    const { data: attachment, error: fetchError } = await supabase
      .from("attachments")
      .select("*")
      .eq("id", attachmentId)
      .single()

    if (fetchError) {
      console.error("Error al obtener información del archivo:", fetchError)
      return { success: false, error: "No se pudo encontrar el archivo" }
    }

    // Extraer la ruta del archivo de la URL
    const fileUrl = new URL(attachment.file_path)
    const pathParts = fileUrl.pathname.split("/")
    const bucketPath = pathParts.slice(pathParts.indexOf(STORAGE_BUCKET) + 1).join("/")

    // Eliminar el archivo del storage
    if (bucketPath) {
      const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([bucketPath])

      if (storageError) {
        console.error("Error al eliminar el archivo del storage:", storageError)
        // Continuamos con la eliminación del registro aunque falle la eliminación del archivo
      }
    }

    // Eliminar el registro de la base de datos
    const { error: deleteError } = await supabase.from("attachments").delete().eq("id", attachmentId)

    if (deleteError) {
      console.error("Error al eliminar el registro del archivo:", deleteError)
      return { success: false, error: "Error al eliminar el archivo" }
    }

    // Verificar si quedan archivos adjuntos para este documento
    const { data: remainingAttachments, error: countError } = await supabase
      .from("attachments")
      .select("id")
      .eq("document_id", attachment.document_id)

    if (!countError && (!remainingAttachments || remainingAttachments.length === 0)) {
      // No quedan archivos, actualizar el documento
      await supabase.from("documents").update({ has_attachments: false }).eq("id", attachment.document_id)
    }

    revalidatePath(`/dashboard/documents/view/${attachment.document_id}`)

    return { success: true }
  } catch (error) {
    console.error("Error en deleteAttachment:", error)
    return { success: false, error: "Error al procesar la solicitud" }
  }
}

export async function uploadDocumentAttachment(formData: FormData) {
  return uploadAttachment(formData)
}
