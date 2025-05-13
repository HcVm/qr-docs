"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { createClientSupabaseClient, type Department } from "@/lib/supabase"
import { Building, Pencil, Plus, Trash2 } from "lucide-react"

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("departments").select("*").order("name", { ascending: true })

      if (error) throw error

      setDepartments(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los departamentos",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (department?: Department) => {
    if (department) {
      setEditingDepartment(department)
      setName(department.name)
      setDescription(department.description || "")
    } else {
      setEditingDepartment(null)
      setName("")
      setDescription("")
    }
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del departamento es requerido",
        variant: "destructive",
      })
      return
    }

    try {
      if (editingDepartment) {
        // Actualizar departamento
        const { error } = await supabase
          .from("departments")
          .update({
            name,
            description,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingDepartment.id)

        if (error) throw error

        toast({
          title: "Departamento actualizado",
          description: "El departamento ha sido actualizado correctamente",
        })
      } else {
        // Crear nuevo departamento
        const { error } = await supabase.from("departments").insert({
          name,
          description,
        })

        if (error) throw error

        toast({
          title: "Departamento creado",
          description: "El departamento ha sido creado correctamente",
        })
      }

      setOpen(false)
      fetchDepartments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar el departamento",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este departamento?")) {
      return
    }

    try {
      // Verificar si hay documentos o usuarios asociados
      const { count: docsCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("department_id", id)

      const { count: usersCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("department_id", id)

      if (docsCount && docsCount > 0) {
        toast({
          title: "No se puede eliminar",
          description: "Hay documentos asociados a este departamento",
          variant: "destructive",
        })
        return
      }

      if (usersCount && usersCount > 0) {
        toast({
          title: "No se puede eliminar",
          description: "Hay usuarios asociados a este departamento",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("departments").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Departamento eliminado",
        description: "El departamento ha sido eliminado correctamente",
      })

      fetchDepartments()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al eliminar el departamento",
        variant: "destructive",
      })
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Departamentos</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Departamento
        </Button>
      </div>

      {loading ? (
        <p>Cargando departamentos...</p>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Building className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No hay departamentos</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            No se han encontrado departamentos en el sistema. Crea uno nuevo para empezar.
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Departamento
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Fecha de creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((department) => (
              <TableRow key={department.id}>
                <TableCell className="font-medium">{department.name}</TableCell>
                <TableCell>{department.description || "Sin descripción"}</TableCell>
                <TableCell>{new Date(department.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(department)}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(department.id)}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDepartment ? "Editar Departamento" : "Nuevo Departamento"}</DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? "Actualiza la información del departamento"
                : "Completa la información para crear un nuevo departamento"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del departamento"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción del departamento"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingDepartment ? "Guardar cambios" : "Crear departamento"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
