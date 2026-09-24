import type { Party } from "@/types/party";

const columns = ["Firm Name", "Owner Name", "Phone", "GSTN", "Customer Type", "City", "State", "Party Status", "Licence Status"];

function licenceStatus(expiry: string) {
  if (!expiry) return "Not Available";
  const days = Math.ceil((new Date(`${expiry}T23:59:59`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  return days < 0 ? "Expired" : days <= 30 ? "Expiring Soon" : "Valid";
}

function rows(records: Party[]) {
  return records.map((party) => [party.firmName, party.ownerName, party.phone, party.registeredGSTN ? party.gstnNumber : "", party.customerType, party.city, party.state, party.active ? "Active" : "Inactive", licenceStatus(party.drugLicenceExpiry)]);
}

export async function exportPartyPdf(records: Party[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const document = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  document.setFontSize(16);
  document.text("Party Details", 14, 15);
  document.setFontSize(9);
  document.text(`Records: ${records.length}`, 14, 22);
  autoTable(document, { startY: 28, head: [columns], body: rows(records).map((row) => row.map(String)), theme: "grid", styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [40, 86, 217] } });
  document.save("Party-Details.pdf");
}

export async function exportPartyExcel(records: Party[]) {
  const { utils, writeFileXLSX } = await import("xlsx");
  const worksheet = utils.aoa_to_sheet([columns, ...rows(records)]);
  worksheet["!cols"] = [{ wch: 30 }, { wch: 24 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 }];
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Party Details");
  writeFileXLSX(workbook, "Party-Details.xlsx");
}
