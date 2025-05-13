import { createServerSupabaseClient } from "./supabase"

export async function createNotification(params: {
  userId: string
  documentId: string
  documentCode: string
  title: string
  message: string
  type?: "info" | "success" | "warning" | "error"
}) {
  const { userId, documentId, documentCode, title, message, type = "info" } = params
  const supabase = createServerSupabaseClient()

  try {
    // Insertamos la notificación directamente ya que la tabla ahora existe
    const { data, error } = await supabase.from("notifications").insert({
      user_id: userId,
      document_id: documentId,
      document_code: documentCode,
      title,
      message,
      type,
      read: false,
    })

    if (error) throw error

    return { success: true, notification: data }
  } catch (error) {
    console.error("Error creating notification:", error)
    return { success: false, error }
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = createServerSupabaseClient()

  try {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return { success: false, error }
  }
}

export async function getUserNotifications(userId: string) {
  const supabase = createServerSupabaseClient()

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) throw error

    return { success: true, notifications: data }
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return { success: false, error, notifications: [] }
  }
}
