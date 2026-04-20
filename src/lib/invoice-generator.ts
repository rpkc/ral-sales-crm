/**
 * Renders an off-screen InvoiceDocument node to PDF or JPEG using
 * html2canvas + jsPDF. The caller passes the DOM ref.
 */
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { DispatchFormat } from "./invoice-dispatch-store";

export async function renderInvoiceFile(
  node: HTMLElement,
  filename: string,
  format: DispatchFormat,
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  if (format === "jpeg") {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const blob = await (await fetch(dataUrl)).blob();
    return { blob, dataUrl };
  }

  // PDF — fit canvas to A4 page width
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight) {
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
  } else {
    // multi-page slicing
    let remaining = imgHeight;
    let position = 0;
    while (remaining > 0) {
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      remaining -= pageHeight;
      position -= pageHeight;
      if (remaining > 0) pdf.addPage();
    }
  }

  const blob = pdf.output("blob");
  const dataUrl = pdf.output("datauristring");
  return { blob, dataUrl };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
