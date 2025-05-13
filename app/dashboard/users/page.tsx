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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { createClientSupabaseClient, type User, type Department } from "@/lib/supabase"
import { Pencil, Plus, Trash2, Users } from "lucide-react"

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [role, setRole] = useState("user")
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchUsers()
    fetchDepartments()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          departments:department_id (
            id,
            name
          )
        `)
        .order("full_name", { ascending: true })

      if (error) throw error

      setUsers(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("*").order("name", { ascending: true })

      if (error) throw error

      setDepartments(data || [])
    } catch (error: any) {
      console.error("Error fetching departments:", error)
    }
  }

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setEmail(user.email)
      setFullName(user.full_name)
      setDepartmentId(user.department_id || "")
      setRole(user.role)
    } else {
      setEditingUser(null)
      setEmail("")
      setFullName("")
      setDepartmentId("")
      setRole("user")
    }
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !fullName.trim()) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      })
      return
    }

    try {
      if (editingUser) {
        // Actualizar usuario
        const { error } = await supabase
          .from("users")
          .update({
            email,
            full_name: fullName,
            department_id: departmentId || null,
            role,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingUser.id)

        if (error) throw error

        toast({
          title: "Usuario actualizado",
          description: "El usuario ha sido actualizado correctamente",
        })
      } else {
        // *** MODIFICACION AQUI: Llamar a la API route para crear usuario con contraseña temporal ***
        const response = await fetch('/api/users/invite', { // La ruta sigue siendo la misma, pero la lógica interna cambió
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }), // Solo enviamos el email; la contraseña se define en la API route
        });

        const result = await response.json();

        if (!response.ok) {
          // Manejar errores de la API route
          // Por ejemplo, si el usuario ya existe
          const errorMessage = result.error || 'Error al crear el usuario en Supabase Auth';
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          return; // Detener el proceso si falla la creación en Auth
        }

        // Si la creación en Auth fue exitosa, ahora insertamos el usuario en nuestra tabla 'users'
        // Usamos el ID del usuario creado por Supabase Authentication
        const newUserId = result.user?.id;

         const { error: insertError } = await supabase.from("users").insert({
            id: newUserId, // Usar el ID de Supabase Auth para vincular con la tabla 'users'
            email,
            full_name: fullName,
            department_id: departmentId || null,
            role,
          });

        if (insertError) {
             console.error("Error inserting new user into 'users' table:", insertError);
             toast({
               title: "Advertencia",
               description: "Usuario creado en autenticación, pero falló la inserción en la tabla de usuarios.",
               variant: "destructive",
             });
        } else {
           // *** MODIFICACION AQUI: Mensaje de éxito para contraseña temporal ***
           toast({
             title: "Usuario creado",
             description: "El usuario ha sido creado con la contraseña temporal 123456789. Informa al usuario que debe cambiarla al iniciar sesión.",
           });
           // *** FIN MODIFICACION ***
        }
        // *** FIN MODIFICACION PRINCIPAL ***
      }

      setOpen(false);
      fetchUsers(); // Refrescar la lista de usuarios después de crear/invitar
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al procesar la solicitud",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      return
    }

    try {
      // Verificar si hay documentos asociados
      const { count: docsCount } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("created_by", id)

      if (docsCount && docsCount > 0) {
        toast({
          title: "No se puede eliminar",
          description: "Hay documentos asociados a este usuario",
          variant: "destructive",
        })
        return
      }

      // Eliminar el usuario de la tabla 'users'
      const { error: deleteUserError } = await supabase.from("users").delete().eq("id", id);

      if (deleteUserError) throw deleteUserError;

      // Opcional: Eliminar el usuario de Supabase Authentication (requiere service_role key)
      // Esto también podría hacerse en una API route segura.
      // const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(id);
      // if (deleteAuthError) console.error("Error deleting user from Auth:", deleteAuthError);

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente",
      })

      fetchUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al eliminar el usuario",
        variant: "destructive",
      })
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {loading ? (
        <p>Cargando usuarios...</p>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No hay usuarios</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            No se han encontrado usuarios en el sistema. Crea uno nuevo para empezar.
          </p>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.departments ? (user.departments as any).name : "Sin departamento"}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
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
            <DialogTitle>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Actualiza la información del usuario"
                : "Completa la información para crear un nuevo usuario"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin departamento</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingUser ? "Guardar cambios" : "Crear usuario"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
