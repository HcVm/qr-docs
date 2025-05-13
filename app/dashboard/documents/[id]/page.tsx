import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { DocumentForm } from "@/components/document-form"

async function fetchDocument(id: string) {
  // Si el ID es "new", retornamos null para indicar que es un nuevo documento
  if (id === "new") {
    return null
  }

  const supabase = createServerComponentClient({ cookies })

  const { data: document, error } = await supabase
    .from("documents")
    .select("*, departments(*), created_by:users(*)")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching document:", error)
    return null
  }

  return document
}

async function fetchDepartments() {
  const supabase = createServerComponentClient({ cookies })

  const { data: departments, error } = await supabase.from("departments").select("*")

  if (error) {
    console.error("Error fetching departments:", error)
    return []
  }

  return departments
}

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const document = await fetchDocument(params.id)
  const departments = await fetchDepartments()

  // No verificamos la autenticación aquí, lo haremos en el componente cliente
  // para evitar problemas con la persistencia de la sesión

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">{params.id === "new" ? "Crear Nuevo Documento" : "Editar Documento"}</h1>
      <DocumentForm document={document} departments={departments} isNew={params.id === "new"} />
    </div>
  )
}
