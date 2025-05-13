"use client"

import { useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Camera, StopCircle } from "lucide-react"

interface QrScannerProps {
  onScan: (result: string) => void
}

export function QrScanner({ onScan }: QrScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null)
  const { toast } = useToast()

  const startScanner = async () => {
    const qrCodeScanner = new Html5Qrcode("qr-reader")
    setHtml5QrCode(qrCodeScanner)

    try {
      setScanning(true)
      await qrCodeScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText)
          stopScanner(qrCodeScanner)
        },
        (errorMessage) => {
          console.log(errorMessage)
        },
      )
    } catch (err) {
      toast({
        title: "Error al acceder a la cámara",
        description: "Por favor, permite el acceso a la cámara para escanear códigos QR.",
        variant: "destructive",
      })
      setScanning(false)
    }
  }

  const stopScanner = async (scanner: Html5Qrcode) => {
    if (scanner && scanner.isScanning) {
      await scanner.stop()
      setScanning(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div id="qr-reader" className="w-full max-w-sm h-64 overflow-hidden rounded-lg"></div>

      {!scanning ? (
        <Button className="mt-4 w-full max-w-sm" onClick={startScanner}>
          <Camera className="mr-2 h-4 w-4" />
          Iniciar escáner
        </Button>
      ) : (
        <Button
          variant="destructive"
          className="mt-4 w-full max-w-sm"
          onClick={() => html5QrCode && stopScanner(html5QrCode)}
        >
          <StopCircle className="mr-2 h-4 w-4" />
          Detener escáner
        </Button>
      )}
    </div>
  )
}
