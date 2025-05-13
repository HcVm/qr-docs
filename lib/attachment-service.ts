import { createServerSupabaseClient } from "./supabase"

export type Attachment = {
  id: string
  document_id: string
  file_name: string
  file_type: string
  file_size: number
  file_path: string
  uploaded_by: string
  description: string | null
  is_main_document: boolean
  version: number
  created_at: string
  updated_at: string
}

export async function getDocumentAttachments(documentId: string): Promise<{
  attachments: Attachment[] | null
  error: Error | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return { attachments: data as Attachment[], error: null }
  } catch (error) {
    console.error("Error fetching attachments:", error)
    return { attachments: null, error: error as Error }
  }
}

export async function uploadAttachment(
  file: File,
  documentId: string,
  userId: string,
  description: string | null = null,
  isMainDocument = false,
): Promise<{
  attachment: Attachment | null
  error: Error | null
}> {
  try {
    const supabase = createServerSupabaseClient()

    // Subir el archivo al bucket de storage
    const fileExt = file.name.split(".").pop()
    const fileName = `${documentId}/${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("document-attachments")
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Obtener la URL pública del archivo
    const { data: urlData } = await supabase.storage.from("document-attachments").getPublicUrl(fileName)

    const filePath = urlData.publicUrl

    // Si es el documento principal y ya existe uno, actualizar el anterior
    if (isMainDocument) {
      const { data: existingMain } = await supabase
        .from("attachments")
        .select("id")
        .eq("document_id", documentId)
        .eq("is_main_document", true)
        .maybeSingle()

      if (existingMain) {
        await supabase.from("attachments").update({ is_main_document: false }).eq("id", existingMain.id)
      }
    }

    // Crear el registro en la tabla de attachments
    const { data, error } = await supabase
      .from("attachments")
      .insert({
        document_id: documentId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_path: filePath,
        uploaded_by: userId,
        description,
        is_main_document: isMainDocument,
      })
      .select()
      .single()

    if (error) throw error

    // Actualizar el flag has_attachments en el documento
    await supabase.from("documents").update({ has_attachments: true }).eq("id", documentId)

    return { attachment: data as Attachment, error: null }
  } catch (error) {
    console.error("Error uploading attachment:", error)
    return { attachment: null, error: error as Error }
  }
}

export async function deleteAttachment(attachmentId: string): Promise<{
  success: boolean
  error: Error | null
}> {
  try {
    const supabase = createServerSupabaseClient()

    // Primero obtenemos la información del adjunto
    const { data: attachment, error: fetchError } = await supabase
      .from("attachments")
      .select("*")
      .eq("id", attachmentId)
      .single()

    if (fetchError) throw fetchError

    // Eliminamos el archivo del storage
    const filePath = attachment.file_path.split("/").pop()
    const { error: storageError } = await supabase.storage
      .from("document-attachments")
      .remove([`${attachment.document_id}/${filePath}`])

    if (storageError) throw storageError

    // Eliminamos el registro de la base de datos
    const { error } = await supabase.from("attachments").delete().eq("id", attachmentId)

    if (error) throw error

    // Verificamos si quedan adjuntos para este documento
    const { count, error: countError } = await supabase
      .from("attachments")
      .select("id", { count: "exact" })
      .eq("document_id", attachment.document_id)

    if (countError) throw countError

    // Si no quedan adjuntos, actualizamos el flag has_attachments
    if (count === 0) {
      await supabase.from("documents").update({ has_attachments: false }).eq("id", attachment.document_id)
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Error deleting attachment:", error)
    return { success: false, error: error as Error }
  }
}
