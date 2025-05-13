import { toast } from "@/components/ui/use-toast"

// Función para exportar a CSV
export const exportToCSV = (data: any[], filename: string) => {
  try {
    // Verificar que hay datos para exportar
    if (!data || data.length === 0) {
      toast({
        title: "Error",
        description: "No hay datos para exportar",
        variant: "destructive",
      })
      return
    }

    // Convertir los datos a formato CSV
    const headers = Object.keys(data[0]).join(",")
    const csvData = data
      .map((row) =>
        Object.values(row)
          .map((value) => {
            // Manejar valores que puedan contener comas
            if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          })
          .join(","),
      )
      .join("\n")

    const csv = `${headers}\n${csvData}`

    // Crear un blob y descargar
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportación exitosa",
      description: "Los datos se han exportado en formato CSV",
    })
  } catch (error) {
    console.error("Error exporting to CSV:", error)
    toast({
      title: "Error",
      description: "No se pudo exportar a CSV",
      variant: "destructive",
    })
  }
}

// Función para exportar a Excel
export const exportToExcel = async (data: any[], filename: string) => {
  try {
    // Verificar que hay datos para exportar
    if (!data || data.length === 0) {
      toast({
        title: "Error",
        description: "No hay datos para exportar",
        variant: "destructive",
      })
      return
    }

    // Importar dinámicamente la biblioteca xlsx
    const XLSX = await import("xlsx")

    // Crear una hoja de trabajo
    const worksheet = XLSX.utils.json_to_sheet(data)

    // Crear un libro de trabajo y añadir la hoja
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estadísticas")

    // Generar el archivo y descargarlo
    XLSX.writeFile(workbook, `${filename}.xlsx`)

    toast({
      title: "Exportación exitosa",
      description: "Los datos se han exportado en formato Excel",
    })
  } catch (error) {
    console.error("Error exporting to Excel:", error)
    toast({
      title: "Error",
      description: "No se pudo exportar a Excel",
      variant: "destructive",
    })
  }
}

// Función para exportar a PDF
export const exportToPDF = async (
  chartId: string,
  filename: string,
  title = "Estadísticas",
  additionalInfo: Record<string, string> = {},
) => {
  try {
    // Importar dinámicamente jsPDF y html2canvas
    const { default: jsPDF } = await import("jspdf")
    const html2canvas = (await import("html2canvas")).default

    // Crear un nuevo documento PDF
    const doc = new jsPDF("landscape")

    // Añadir título
    doc.setFontSize(18)
    doc.text(title, 14, 22)

    // Añadir fecha
    doc.setFontSize(12)
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30)

    // Añadir información adicional
    let yPos = 38
    Object.entries(additionalInfo).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 14, yPos)
      yPos += 8
    })

    // Capturar el gráfico si se proporciona un ID
    if (chartId) {
      try {
        const chartElement = document.getElementById(chartId)
        if (chartElement) {
          // Usar html2canvas para capturar el gráfico
          const canvas = await html2canvas(chartElement)
          const imgData = canvas.toDataURL("image/png")

          // Añadir la imagen al PDF
          doc.addImage(imgData, "PNG", 14, yPos + 10, 270, 150)
        }
      } catch (error) {
        console.error("Error capturing chart:", error)
      }
    }

    // Guardar el PDF
    doc.save(`${filename}.pdf`)

    toast({
      title: "Exportación exitosa",
      description: "Los datos se han exportado en formato PDF",
    })
  } catch (error) {
    console.error("Error exporting to PDF:", error)
    toast({
      title: "Error",
      description: "No se pudo exportar a PDF",
      variant: "destructive",
    })
  }
}

// Función para exportar un informe completo en PDF
export const exportFullReport = async (
  containerId: string,
  filename: string,
  title = "Informe de Estadísticas",
  metadata: Record<string, string> = {},
) => {
  try {
    // Importar dinámicamente jsPDF y html2canvas
    const { default: jsPDF } = await import("jspdf")
    const html2canvas = (await import("html2canvas")).default

    // Obtener el contenedor
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error("Contenedor no encontrado")
    }

    // Crear un nuevo documento PDF
    const doc = new jsPDF("landscape")

    // Añadir título
    doc.setFontSize(20)
    doc.text(title, 14, 20)

    // Añadir fecha y metadatos
    doc.setFontSize(12)
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30)

    let yPos = 40
    Object.entries(metadata).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 14, yPos)
      yPos += 10
    })

    // Capturar cada sección del informe
    const chartElements = container.querySelectorAll('[id^="chart-"]')

    if (chartElements.length === 0) {
      // Si no hay gráficos, capturar todo el contenedor
      const canvas = await html2canvas(container)
      const imgData = canvas.toDataURL("image/png")

      // Ajustar la imagen al ancho de la página
      const imgWidth = doc.internal.pageSize.getWidth() - 28
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Si la imagen es demasiado alta, dividirla en varias páginas
      if (imgHeight > doc.internal.pageSize.getHeight() - yPos - 20) {
        const pageHeight = doc.internal.pageSize.getHeight() - 20
        let heightLeft = imgHeight
        let position = yPos

        // Añadir la primera parte de la imagen
        doc.addImage(imgData, "PNG", 14, position, imgWidth, imgHeight)
        heightLeft -= pageHeight - position

        // Añadir el resto de la imagen en nuevas páginas
        while (heightLeft > 0) {
          position = 20
          doc.addPage()
          doc.addImage(imgData, "PNG", 14, position - imgHeight + heightLeft, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }
      } else {
        // La imagen cabe en una página
        doc.addImage(imgData, "PNG", 14, yPos, imgWidth, imgHeight)
      }
    } else {
      // Capturar cada gráfico individualmente
      for (let i = 0; i < chartElements.length; i++) {
        const element = chartElements[i] as HTMLElement
        const canvas = await html2canvas(element)
        const imgData = canvas.toDataURL("image/png")

        // Obtener el título del gráfico
        const titleElement = element.closest("[data-chart-title]")
        const chartTitle = titleElement?.getAttribute("data-chart-title") || `Gráfico ${i + 1}`

        // Añadir una nueva página para cada gráfico excepto el primero
        if (i > 0) {
          doc.addPage()
          yPos = 20
        }

        // Añadir título del gráfico
        doc.setFontSize(16)
        doc.text(chartTitle, 14, yPos)
        yPos += 10

        // Añadir la imagen
        const imgWidth = doc.internal.pageSize.getWidth() - 28
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        doc.addImage(imgData, "PNG", 14, yPos, imgWidth, imgHeight)
      }
    }

    // Guardar el PDF
    doc.save(`${filename}.pdf`)

    toast({
      title: "Exportación exitosa",
      description: "El informe completo se ha exportado en formato PDF",
    })
  } catch (error) {
    console.error("Error exporting full report:", error)
    toast({
      title: "Error",
      description: "No se pudo exportar el informe completo",
      variant: "destructive",
    })
  }
}
