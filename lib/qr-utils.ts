export async function generateDocumentQR(): Promise<string> {
  // Implementación básica para generar un código único
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 5)
  return `DOC-${timestamp}-${random}`.toUpperCase()
}
