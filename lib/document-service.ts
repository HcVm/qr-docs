import { createServerSupabaseClient, type Document, type Movement, type Department, type User } from "./supabase"

export async function getDocumentByCode(documentCode: string): Promise<{
  document: Document | null
  error: Error | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from("documents").select("*").eq("document_code", documentCode).single()

    if (error) throw error

    return { document: data as Document, error: null }
  } catch (error) {
    console.error("Error fetching document:", error)
    return { document: null, error: error as Error }
  }
}

export async function getDocumentMovements(documentId: string): Promise<{
  movements:
    | (Movement & {
        from_department?: Department | null
        to_department: Department
        user: User
      })[]
    | null
  error: Error | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from("movements")
      .select(`
        *,
        from_department:from_department_id(id, name),
        to_department:to_department_id(id, name),
        user:user_id(id, full_name)
      `)
      .eq("document_id", documentId)
      .order("created_at", { ascending: true })

    if (error) throw error

    return {
      movements: data as any,
      error: null,
    }
  } catch (error) {
    console.error("Error fetching movements:", error)
    return { movements: null, error: error as Error }
  }
}

export async function createDocument(document: Omit<Document, "id" | "created_at" | "updated_at">): Promise<{
  document: Document | null
  error: Error | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from("documents").insert(document).select().single()

    if (error) throw error

    return { document: data as Document, error: null }
  } catch (error) {
    console.error("Error creating document:", error)
    return { document: null, error: error as Error }
  }
}

export async function createMovement(movement: Omit<Movement, "id" | "created_at">): Promise<{
  movement: Movement | null
  error: Error | null
}> {
  try {
    const supabase = createServerSupabaseClient()

    // Simplemente insertamos el movimiento sin intentar recuperar datos
    const { error } = await supabase.from("movements").insert(movement)

    if (error) throw error

    // Devolvemos un objeto de movimiento simulado ya que no necesitamos los datos reales
    return {
      movement: {
        id: "generated-id", // ID simulado
        created_at: new Date().toISOString(),
        ...movement,
      } as Movement,
      error: null,
    }
  } catch (error) {
    console.error("Error creating movement:", error)
    return { movement: null, error: error as Error }
  }
}

export async function getDepartments(): Promise<{
  departments: Department[] | null
  error: Error | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from("departments").select("*").order("name", { ascending: true })

    if (error) throw error

    return { departments: data as Department[], error: null }
  } catch (error) {
    console.error("Error fetching departments:", error)
    return { departments: null, error: error as Error }
  }
}

export async function getUsers(): Promise<{
  users: User[] | null
  error: Error | null
}> {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from("users").select("*").order("full_name", { ascending: true })

    if (error) throw error

    return { users: data as User[], error: null }
  } catch (error) {
    console.error("Error fetching users:", error)
    return { users: null, error: error as Error }
  }
}
