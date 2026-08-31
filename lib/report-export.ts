import type { ReportDataset } from "./atsoc-reports";

const safeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const download = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

const xmlEscape = (value: string | number) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export function buildReportExcelDocument(report: ReportDataset, month: string) {
  const highlights = report.highlights
    .map(
      (item) =>
        `<tr><th>${xmlEscape(item.label)}</th><td>${xmlEscape(item.value)}</td></tr>`,
    )
    .join("");
  const headers = report.columns
    .map((column) => `<th>${xmlEscape(column)}</th>`)
    .join("");
  const rows = report.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${xmlEscape(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial}table{border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #b8c5d6;padding:7px}th{background:#173a68;color:#fff}</style></head><body><h1>${xmlEscape(report.title)}</h1><p>Período: ${xmlEscape(month)}</p><table>${highlights}</table><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

export function exportReportExcel(report: ReportDataset, month: string) {
  const html = buildReportExcelDocument(report, month);
  download(
    `${safeFileName(report.title)}-${month}.xls`,
    new Blob([`\uFEFF${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8",
    }),
  );
}

const ascii = (value: string | number) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");

export function buildReportPdfDocument(report: ReportDataset, month: string) {
  const rawLines = [
    report.title,
    `Periodo: ${month}`,
    "",
    ...report.highlights.map((item) => `${item.label}: ${item.value}`),
    "",
    report.columns.join(" | "),
    ...report.rows.map((row) =>
      row.map((cell) => String(cell).slice(0, 32)).join(" | "),
    ),
  ].map(ascii);
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(rawLines.length / 38)) },
    (_, index) => rawLines.slice(index * 38, index * 38 + 38),
  );
  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  pages.forEach((lines, index) => {
    const pageNumber = 4 + index * 2;
    const contentNumber = pageNumber + 1;
    pageObjectNumbers.push(pageNumber);
    const content = `BT /F1 9 Tf 38 806 Td 12 TL ${lines
      .map((line, lineIndex) => `${lineIndex ? "T* " : ""}(${line}) Tj`)
      .join(" ")} ET`;
    objects[pageNumber] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNumber} 0 R >>`;
    objects[contentNumber] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers
    .map((number) => `${number} 0 R`)
    .join(" ")}] /Count ${pageObjectNumbers.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

export function exportReportPdf(report: ReportDataset, month: string) {
  const pdf = buildReportPdfDocument(report, month);
  download(`${safeFileName(report.title)}-${month}.pdf`, new Blob([pdf], {
    type: "application/pdf",
  }));
}
