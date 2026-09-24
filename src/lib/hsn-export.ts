import type { HsnRecord } from "@/types/hsn";

const columns = ["HSN Code", "Category", "Status"];

function rows(records: HsnRecord[]) {
  return records.map((record) => [record.hsnCode, record.category, record.status]);
}

export async function exportHsnExcel(records: HsnRecord[]) {
  const { utils, writeFileXLSX } = await import("xlsx");
  const worksheet = utils.aoa_to_sheet([columns, ...rows(records)]);
  worksheet["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 12 }];
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "HSN Master");
  writeFileXLSX(workbook, `hsn-master-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportHsnPdf(records: HsnRecord[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const document = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const exportDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  document.setFontSize(16);
  document.text("HSN Master", 14, 15);
  document.setFontSize(9);
  document.text(`Export date: ${exportDate} | Records: ${records.length}`, 14, 22);
  autoTable(document, {
    startY: 28,
    head: [columns],
    body: rows(records).map((row) => row.map(String)),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [40, 86, 217] },
    didDrawPage: (data) => {
      const pageCount = document.getNumberOfPages();
      document.setFontSize(8);
      document.text(`Page ${data.pageNumber} of ${pageCount}`, 270, 200, { align: "right" });
    },
  });
  document.save(`hsn-master-${new Date().toISOString().slice(0, 10)}.pdf`);
}
