"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrScanner } from "./components/qr-scanner"
import { DocumentHistory } from "./components/document-history"
import { DocumentInfo } from "./components/document-info"
import { QrGenerator } from "./components/qr-generator"
import { Scan, FileText, QrCode } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const [documentCode, setDocumentCode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("scan")
  const { toast } = useToast()

  const handleScan = (result: string) => {
    // Validar si el resultado es un código de documento válido
    if (result.startsWith("DOC-")) {
      setDocumentCode(result)
      setActiveTab("details")
    } else {
      toast({
        title: "Código QR inválido",
        description: "El código escaneado no corresponde a un documento válido",
        variant: "destructive",
      })
    }
  }

  return (
    <main className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-6">Seguimiento de Documentos</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <Scan className="h-4 w-4" />
            <span>Escanear QR</span>
          </TabsTrigger>
          <TabsTrigger value="details" disabled={!documentCode} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Detalles</span>
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            <span>Generar QR</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan">
          <Card>
            <CardHeader>
              <CardTitle>Escanear Código QR</CardTitle>
              <CardDescription>
                Escanea el código QR de un documento para ver su historial de movimientos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QrScanner onScan={handleScan} />

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">¿No tienes un código QR para probar?</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDocumentCode("DOC-2023-001")
                    setActiveTab("details")
                  }}
                >
                  Ver documento de ejemplo
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          {documentCode && (
            <div className="space-y-6">
              <DocumentInfo documentId={documentCode} />
              <DocumentHistory documentId={documentCode} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="generate">
          <QrGenerator />
        </TabsContent>
      </Tabs>
    </main>
  )
}
