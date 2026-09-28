/**
 * Turns the rendered A4 report pages into a downloadable PDF. Both libraries
 * are loaded only when a report is generated, keeping the app bundle small.
 */
export async function exportReportPdf(container: HTMLElement, fileName: string) {
  const [{ toJpeg, getFontEmbedCSS }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')])
  await document.fonts.ready
  const pages = Array.from(container.querySelectorAll<HTMLElement>('.report-page'))
  if (!pages.length) throw new Error('report has no pages')
  const fontEmbedCSS = await getFontEmbedCSS(container)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  for (const [index, page] of pages.entries()) {
    const image = await toJpeg(page, { pixelRatio: 2, quality: 0.92, backgroundColor: '#ffffff', fontEmbedCSS, cacheBust: false })
    if (index > 0) pdf.addPage()
    pdf.addImage(image, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
  }
  pdf.setProperties({ title: fileName.replace(/\.pdf$/, ''), creator: 'Menna Flow' })
  pdf.save(fileName)
}
