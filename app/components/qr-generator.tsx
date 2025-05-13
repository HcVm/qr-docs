"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QRCodeSVG } from "qrcode.react"
import { Download, QrCode } from "lucide-react"
import { generateDocumentQR, fetchDepartments, fetchUsers } from "../actions"
import { useToast } from "@/hooks/use-toast"

export function QrGenerator() {
  const [documentCode, setDocumentCode] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [userId, setUserId] = useState("")
  const [qrValue, setQrValue] = useState("")
  const [departments, setDepartments] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      try {
        const depsResult = await fetchDepartments()
        if (depsResult.success) {
          setDepartments(depsResult.departments || [])
        }

        const usersResult = await fetchUsers()
        if (usersResult.success) {
          setUsers(usersResult.users || [])
        }
      } catch (err) {
        console.error("Error loading data:", err)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos necesarios",
          variant: "destructive",
        })
      }
    }

    loadData()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("documentCode", documentCode)
      formData.append("title", title)
      formData.append("description", description)
      formData.append("departmentId", departmentId)
      formData.append("userId", userId)

      const result = await generateDocumentQR(formData)

      if (result.success) {
        setQrValue(result.documentCode)
        toast({
          title: "Éxito",
          description: "Documento creado correctamente",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo crear el documento",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error generating QR:", err)
      toast({
        title: "Error",
        description: "Ocurrió un error al generar el código QR",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadQR = () => {
    const svg = document.getElementById("qr-code")
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL("image/png")

      const downloadLink = document.createElement("a")
      downloadLink.download = `qr-${documentCode}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = "data:image/svg+xml;base64," + btoa(svgData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generar Código QR</CardTitle>
        <CardDescription>Crea un código QR para un nuevo documento</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-code">Código del Documento</Label>
            <Input
              id="document-code"
              placeholder="Ej: DOC-2023-002"
              value={documentCode}
              onChange={(e) => setDocumentCode(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-title">Título del Documento</Label>
            <Input
              id="document-title"
              placeholder="Ej: Solicitud de Licencia"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document-description">Descripción</Label>
            <Textarea
              id="document-description"
              placeholder="Descripción breve del documento"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Select value={departmentId} onValueChange={setDepartmentId} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar departamento" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">Usuario</Label>
            <Select value={userId} onValueChange={setUserId} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={loading || !documentCode || !title || !departmentId || !userId}
            className="w-full"
          >
            <QrCode className="mr-2 h-4 w-4" />
            {loading ? "Generando..." : "Generar Código QR"}
          </Button>
        </form>

        {qrValue && (
          <div className="flex flex-col items-center mt-6 p-4 border rounded-lg">
            <QRCodeSVG id="qr-code" value={qrValue} size={200} level="H" includeMargin={true} />
            <Button variant="outline" onClick={downloadQR} className="mt-4">
              <Download className="mr-2 h-4 w-4" />
              Descargar QR
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
