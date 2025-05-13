"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, FileIcon } from "lucide-react"
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export-utils"

interface ExportMenuProps {
  data: any[]
  filename: string
  chartId?: string
  label?: string
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  buttonSize?: "default" | "sm" | "lg" | "icon"
  align?: "start" | "center" | "end"
  showCSV?: boolean
  showExcel?: boolean
  showPDF?: boolean
  chartTitle?: string
  additionalInfo?: Record<string, string>
}

export function ExportMenu({
  data,
  filename,
  chartId,
  label = "Exportar datos",
  buttonVariant = "outline",
  buttonSize = "sm",
  align = "end",
  showCSV = true,
  showExcel = true,
  showPDF = true,
  chartTitle,
  additionalInfo = {},
}: ExportMenuProps) {
  const handleExport = (format: "csv" | "excel" | "pdf") => {
    const formattedFilename = `${filename}_${new Date().toISOString().split("T")[0]}`

    switch (format) {
      case "csv":
        exportToCSV(data, formattedFilename)
        break
      case "excel":
        exportToExcel(data, formattedFilename)
        break
      case "pdf":
        exportToPDF(chartId || "", formattedFilename, chartTitle || label, additionalInfo)
        break
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showCSV && (
          <DropdownMenuItem onClick={() => handleExport("csv")}>
            <FileText className="mr-2 h-4 w-4" />
            CSV
          </DropdownMenuItem>
        )}
        {showExcel && (
          <DropdownMenuItem onClick={() => handleExport("excel")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </DropdownMenuItem>
        )}
        {showPDF && (
          <DropdownMenuItem onClick={() => handleExport("pdf")}>
            <FileIcon className="mr-2 h-4 w-4" />
            PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
