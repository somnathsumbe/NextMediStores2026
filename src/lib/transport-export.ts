import type { TransportRecord } from "@/types/transport";

const columns = ["City", "Transport Name", "Address", "Transport Type", "Status"];

function rows(records: TransportRecord[]) {
  return records.map((record) => [record.city, record.name, record.address, record.type, record.status]);
}

export async function exportTransportExcel(records: TransportRecord[]) {
  const { utils, writeFileXLSX } = await import("xlsx");
  const worksheet = utils.aoa_to_sheet([columns, ...rows(records)]);
  worksheet["!cols"] = [{ wch: 18 }, { wch: 30 }, { wch: 42 }, { wch: 22 }, { wch: 12 }];
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Transport Details");
  writeFileXLSX(workbook, `transport-details-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportTransportPdf(records: TransportRecord[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const document = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const exportDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  document.setFontSize(16);
  document.text("Transport Details", 14, 15);
  document.setFontSize(9);
  document.text(`Export date: ${exportDate} | Records: ${records.length}`, 14, 22);
  autoTable(document, {
    startY: 28,
    head: [columns],
    body: rows(records).map((row) => row.map(String)),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 86, 217] },
  });
  document.save(`transport-details-${new Date().toISOString().slice(0, 10)}.pdf`);
}
