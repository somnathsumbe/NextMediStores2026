"use client";

import { useEffect, useMemo, useState } from "react";
import type { Party } from "@/types/party";
import { calculatePurchaseItemAmount, calculatePurchaseOrderSummary } from "@/utils/purchase-order";
import styles from "./PurchasePrintActions.module.css";

type PurchaseLine = {
  productName?: string;
  manufacturer?: string;
  hsn?: string;
  packageDescription?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity?: number;
  freeQuantity?: number;
  sellRate?: number;
  discountPercentage?: number;
  gst?: number;
  amount?: number;
};

type PurchaseRecord = {
  id: string;
  voucherNumber?: number | string;
  purchaseOrderNumber?: string | number;
  orderDate?: string;
  billNumber?: string;
  billDate?: string;
  lrNumber?: string;
  dispatchDate?: string;
  godown?: string;
  paymentMethod?: string;
  paymentTerms?: string;
  deliveryAddress?: string;
  remarks?: string;
  status?: string;
  items?: PurchaseLine[];
};

type BusinessProfile = {
  businessName?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  drugLicenseNumber?: string;
};

type BillMode = "bill" | "service" | "ai";
type PrintAction = "print-bill" | "print-service" | "ai-view" | "download-pdf";

function numeric(value: unknown) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
}

function display(value: unknown) {
  return value === undefined || value === null || String(value).trim() === "" ? "-" : String(value);
}

function date(value?: string) {
  if (!value) return "-";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function addressLine(value?: { address?: string; city?: string; state?: string; pincode?: string }) {
  return [value?.address, value?.city, value?.state, value?.pincode].filter((part) => String(part ?? "").trim()).join(", ") || "-";
}

type CalculatedLine = PurchaseLine & ReturnType<typeof calculatePurchaseItemAmount>;
type PurchaseTotals = ReturnType<typeof calculatePurchaseOrderSummary> & { totalQuantity: number; freeQuantity: number };

function PurchaseBillTable({ lines, totals, variant }: { lines: CalculatedLine[]; totals: PurchaseTotals; variant: "preview" | "print" }) {
  const tableClass = variant === "preview" ? styles.aiTable : styles.printTable;
  return <table className={tableClass}>
    <thead><tr><th>Sr.</th><th>Product Name</th><th>Package Description</th><th>Manufacturer</th><th>HSN</th><th>Batch Number</th><th>Expiry</th><th>Quantity</th><th>Free</th><th>Purchase Rate</th><th>Discount</th><th>Taxable</th><th>GST %</th><th>GST Amount</th><th>Total</th></tr></thead>
    <tbody>{lines.map((item, index) => <tr key={`${item.productName}-${item.batchNumber}-${index}`}>
      <td>{index + 1}</td><td className={styles.productNameCell}>{item.productName || "-"}</td><td>{item.packageDescription || "-"}</td><td>{item.manufacturer || "-"}</td><td>{item.hsn || "-"}</td><td>{item.batchNumber || "-"}</td><td>{date(item.expiryDate)}</td>
      <td className={styles.quantityCell}>{numeric(item.quantity)}</td><td className={styles.quantityCell}>{numeric(item.freeQuantity)}</td><td className={styles.amountCell}>{currency(numeric(item.sellRate))}</td>
      <td className={styles.amountCell}>{currency(item.discountAmount)}{numeric(item.discountPercentage) > 0 && <small>{numeric(item.discountPercentage)}%</small>}</td>
      <td className={styles.amountCell}>{currency(item.taxableAmount)}</td><td className={styles.quantityCell}>{numeric(item.gst)}%</td><td className={styles.amountCell}>{currency(item.taxAmount)}</td><td className={styles.amountCell}>{currency(item.amount)}</td>
    </tr>)}</tbody>
    <tfoot>
      <tr className={styles.totalRow}><td colSpan={7}>TOTAL</td><td className={styles.quantityCell}>{totals.totalQuantity}</td><td className={styles.quantityCell}>{totals.freeQuantity}</td><td></td><td className={styles.amountCell}>{currency(totals.discount)}</td><td className={styles.amountCell}>{currency(totals.taxableAmount)}</td><td></td><td className={styles.amountCell}>{currency(totals.totalTax)}</td><td className={styles.amountCell}>{currency(totals.grandTotal)}</td></tr>
    </tfoot>
  </table>;
}

function ServiceBillTable({ lines, totals }: { lines: CalculatedLine[]; totals: PurchaseTotals }) {
  return <table className={styles.printTable}>
    <thead><tr><th>Service Description</th><th>Quantity</th><th>Rate</th><th>Discount</th><th>GST</th><th>Taxable Amount</th><th>Total Amount</th></tr></thead>
    <tbody>{lines.map((item, index) => <tr key={`${item.productName}-${index}`}><td>Purchase service · {item.productName || "Product"}</td><td className={styles.quantityCell}>{numeric(item.quantity)}</td><td className={styles.amountCell}>{currency(numeric(item.sellRate))}</td><td className={styles.amountCell}>{currency(item.discountAmount)}</td><td className={styles.quantityCell}>{numeric(item.gst)}% ({currency(item.taxAmount)})</td><td className={styles.amountCell}>{currency(item.taxableAmount)}</td><td className={styles.amountCell}>{currency(item.amount)}</td></tr>)}</tbody>
    <tfoot><tr className={styles.totalRow}><td>TOTAL</td><td className={styles.quantityCell}>{totals.totalQuantity}</td><td></td><td className={styles.amountCell}>{currency(totals.discount)}</td><td className={styles.amountCell}>{currency(totals.totalTax)}</td><td className={styles.amountCell}>{currency(totals.taxableAmount)}</td><td className={styles.amountCell}>{currency(totals.grandTotal)}</td></tr></tfoot>
  </table>;
}

function BillBottomSection({ totals, supplierName }: { totals: PurchaseTotals; supplierName: string }) {
  return <table className={styles.billBottomTable}>
    <colgroup><col className={styles.signatureColumn} /><col /></colgroup>
    <tbody>
      <tr>
        <td rowSpan={3} className={styles.signatureCell}>
          <div className={styles.signatureContent}>
            <div className={styles.signatureTitle}>AUTHORIZED SIGNATURE</div>
            <div className={styles.signatureSpace}></div>
            <strong>For: {supplierName}</strong>
            <div className={styles.signatureLine}></div>
            <div className={styles.signatureLabel}>Authorized Signatory</div>
          </div>
        </td>
        <td className={styles.summaryRowCell}><div className={styles.summaryPairGrid}>
          <div className={styles.summaryLabel}>Sub Total</div><div className={styles.summaryValue}>{currency(totals.subtotal)}</div>
          <div className={styles.summaryLabel}>Total Discount</div><div className={styles.summaryValue}>{currency(totals.discount)}</div>
        </div></td>
      </tr>
      <tr><td className={styles.summaryRowCell}><div className={styles.summaryTripleGrid}>
        <div className={styles.summaryLabel}>Taxable Amount</div><div className={styles.summaryValue}>{currency(totals.taxableAmount)}</div>
        <div className={styles.summaryLabel}>Total GST</div><div className={styles.summaryValue}>{currency(totals.totalTax)}</div>
        <div className={styles.summaryLabel}>Round Off</div><div className={styles.summaryValue}>{currency(totals.roundOff)}</div>
      </div></td></tr>
      <tr><td className={styles.summaryRowCell}><div className={styles.grandTotalRow}><strong>GRAND TOTAL</strong><strong>{currency(totals.grandTotal)}</strong></div></td></tr>
    </tbody>
  </table>;
}

export default function PurchasePrintActions({ orderId, supplier }: { orderId: string; supplier?: Party }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<BillMode | null>(null);
  const [record, setRecord] = useState<PurchaseRecord | null>(null);
  const [business, setBusiness] = useState<BusinessProfile>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lines = useMemo(() => (record?.items ?? []).map((item) => ({
    ...item,
    ...calculatePurchaseItemAmount({
      quantity: numeric(item.quantity),
      sellRate: numeric(item.sellRate),
      discountPercentage: numeric(item.discountPercentage),
      gst: numeric(item.gst),
    }),
  })), [record]);

  const summary = useMemo(() => calculatePurchaseOrderSummary((record?.items ?? []).map((item) => ({
    quantity: numeric(item.quantity),
    sellRate: numeric(item.sellRate),
    discountPercentage: numeric(item.discountPercentage),
    gst: numeric(item.gst),
  }))), [record]);

  const totals = useMemo(() => ({
    totalQuantity: (record?.items ?? []).reduce((sum, item) => sum + numeric(item.quantity), 0),
    freeQuantity: (record?.items ?? []).reduce((sum, item) => sum + numeric(item.freeQuantity), 0),
    ...summary,
  }), [record, summary]);

  useEffect(() => {
    if (mode !== "bill" && mode !== "service") return;
    document.body.classList.add("purchase-print-active");
    const printTimer = window.setTimeout(() => window.print(), 200);
    const afterPrint = () => {
      document.body.classList.remove("purchase-print-active");
      setMode(null);
    };
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.clearTimeout(printTimer);
      window.removeEventListener("afterprint", afterPrint);
      document.body.classList.remove("purchase-print-active");
    };
  }, [mode, record]);

  async function downloadPdf(purchase: PurchaseRecord, profile: BusinessProfile, calculatedLines: typeof lines, calculatedTotals: typeof totals) {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const document = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const voucher = purchase.voucherNumber ?? purchase.purchaseOrderNumber ?? purchase.id;
    const supplierName = supplier?.firmName || "Supplier";
    const customerName = profile.businessName || profile.name || "MediStore";
    document.setFontSize(17);
    document.setTextColor(31, 64, 93);
    document.text(supplierName, 14, 16);
    document.setFontSize(9);
    document.setTextColor(85, 96, 107);
    document.text(addressLine(supplier), 14, 22);
    document.text(`Mobile: ${display(supplier?.phone)}  |  Email: ${display(supplier?.email)}`, 14, 27);
    document.text(`GST: ${supplier?.registeredGSTN ? display(supplier.gstnNumber) : "-"}  |  Drug License: ${display(supplier?.drugLicenceNumber)}`, 14, 32);
    document.setFontSize(15);
    document.setTextColor(31, 64, 93);
    document.text("PURCHASE BILL", 282, 16, { align: "right" });
    document.setFontSize(9);
    document.setTextColor(60, 68, 78);
    document.text(`Voucher: ${voucher}   Bill: ${display(purchase.billNumber)}`, 282, 23, { align: "right" });
    document.text(`Bill Date: ${date(purchase.billDate)}   Order Date: ${date(purchase.orderDate)}`, 282, 28, { align: "right" });
    document.text(`Customer / Party: ${customerName}`, 14, 41);
    document.text(`Address: ${addressLine(profile)}   Mobile: ${display(profile.mobile)}   GST: ${display(profile.gstNumber)}`, 14, 46);
    document.text(`Bill to: ${addressLine(profile)}   Drug License: ${display(profile.drugLicenseNumber)}`, 14, 51);
    document.text(`LR: ${display(purchase.lrNumber)}   Dispatch: ${date(purchase.dispatchDate)}   Godown: ${display(purchase.godown)}`, 14, 56);

    autoTable(document, {
      startY: 62,
      head: [["Sr.", "Product", "Package", "Manufacturer", "HSN", "Batch", "Expiry", "Qty", "Free", "Rate", "Discount", "Taxable", "GST %", "GST Amount", "Total"]],
      body: calculatedLines.map((item, index) => [
        String(index + 1), item.productName || "-", item.packageDescription || "-", item.manufacturer || "-", item.hsn || "-", item.batchNumber || "-", date(item.expiryDate),
        String(numeric(item.quantity)), String(numeric(item.freeQuantity)), currency(numeric(item.sellRate)), currency(item.discountAmount),
        currency(item.taxableAmount), `${numeric(item.gst)}%`, currency(item.taxAmount), currency(item.amount),
      ]),
      foot: [
        [
          { content: "TOTAL", colSpan: 7 },
          String(calculatedTotals.totalQuantity),
          String(calculatedTotals.freeQuantity),
          "",
          currency(calculatedTotals.discount),
          currency(calculatedTotals.taxableAmount),
          "",
          currency(calculatedTotals.totalTax),
          currency(calculatedTotals.grandTotal),
        ],
      ],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.2, overflow: "linebreak" },
      headStyles: { fillColor: [31, 74, 93] },
      footStyles: { fillColor: [242, 247, 244], textColor: [36, 53, 44], fontStyle: "bold" },
      showFoot: "lastPage",
      showHead: "everyPage",
      margin: { left: 14, right: 14, bottom: 15 },
      rowPageBreak: "avoid",
    });

    const finalY = (document as typeof document & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 70;
    const pageHeight = document.internal.pageSize.getHeight();
    const panelHeight = 58;
    const panelTop = finalY + 1 + panelHeight > pageHeight - 10 ? (document.addPage(), 14) : finalY + 1;
    const panelLeft = 14;
    const panelWidth = 269;
    const signatureWidth = panelWidth * 0.45;
    const summaryLeft = panelLeft + signatureWidth;
    const summaryWidth = panelWidth - signatureWidth;
    const summaryTop = panelTop + 12;
    const summaryRowOne = panelTop + 28;
    const summaryRowTwo = panelTop + 43;

    document.setDrawColor(222, 226, 230);
    document.setLineWidth(0.3);
    document.setFillColor(255, 255, 255);
    document.rect(panelLeft, panelTop, signatureWidth, panelHeight, "FD");
    document.rect(summaryLeft, panelTop, summaryWidth, panelHeight, "FD");
    document.setFontSize(9);
    document.setTextColor(43, 58, 49);
    document.setFont("helvetica", "bold");
    document.text("AUTHORIZED SIGNATURE", panelLeft + signatureWidth / 2, panelTop + 8, { align: "center" });
    document.setFontSize(8);
    document.text(`For: ${supplierName}`, panelLeft + signatureWidth / 2, panelTop + 42, { align: "center", maxWidth: signatureWidth - 12 });
    document.line(panelLeft + 18, panelTop + 48, panelLeft + signatureWidth - 18, panelTop + 48);
    document.setFont("helvetica", "normal");
    document.text("Authorized Signatory", panelLeft + signatureWidth / 2, panelTop + 53, { align: "center" });

    document.setFillColor(246, 248, 247);
    document.rect(summaryLeft, panelTop, summaryWidth, 12, "FD");
    document.setFont("helvetica", "bold");
    document.setFontSize(8);
    document.setTextColor(40, 73, 61);
    document.text("TOTAL BILL SUMMARY", summaryLeft + summaryWidth / 2, panelTop + 8, { align: "center" });
    document.line(summaryLeft, summaryTop, summaryLeft + summaryWidth, summaryTop);
    document.line(summaryLeft, summaryRowOne, summaryLeft + summaryWidth, summaryRowOne);
    document.line(summaryLeft, summaryRowTwo, summaryLeft + summaryWidth, summaryRowTwo);
    document.setFont("helvetica", "normal");
    document.setFontSize(7.5);
    document.setTextColor(43, 58, 49);
    document.text(`Sub Total  ${currency(calculatedTotals.subtotal)}`, summaryLeft + 3, panelTop + 17);
    document.text(`Total Discount  ${currency(calculatedTotals.discount)}`, summaryLeft + 3, panelTop + 24);
    document.text(`Taxable Amount  ${currency(calculatedTotals.taxableAmount)}`, summaryLeft + 3, panelTop + 34);
    document.text(`Total GST  ${currency(calculatedTotals.totalTax)}   Round Off  ${currency(calculatedTotals.roundOff)}`, summaryLeft + 3, panelTop + 40);
    document.setFillColor(232, 243, 237);
    document.rect(summaryLeft, summaryRowTwo, summaryWidth, panelHeight - (summaryRowTwo - panelTop), "F");
    document.setTextColor(26, 80, 61);
    document.setFont("helvetica", "bold");
    document.setFontSize(10);
    document.text("GRAND TOTAL", summaryLeft + 4, panelTop + 51);
    document.text(currency(calculatedTotals.grandTotal), summaryLeft + summaryWidth - 4, panelTop + 51, { align: "right" });
    document.setDrawColor(222, 226, 230);
    document.line(summaryLeft, summaryRowTwo, summaryLeft + summaryWidth, summaryRowTwo);
    document.save(`purchase-bill-${String(voucher).replace(/[^a-z0-9-_]/gi, "-")}.pdf`);
  }

  async function chooseAction(action: PrintAction) {
    setLoading(true);
    setError("");
    try {
      const [purchaseResponse, sessionResponse] = await Promise.all([
        fetch(`/api/purchase/${encodeURIComponent(orderId)}`, { cache: "no-store" }),
        fetch("/api/auth/session", { cache: "no-store", credentials: "include" }),
      ]);
      const [purchasePayload, sessionPayload] = await Promise.all([
        purchaseResponse.json().catch(() => ({})),
        sessionResponse.json().catch(() => ({})),
      ]);
      if (!purchaseResponse.ok) throw new Error(purchasePayload.error || "Unable to load this purchase order.");
      if (!sessionResponse.ok) throw new Error("Unable to load MediStore business details.");

      const purchase = purchasePayload.record as PurchaseRecord;
      const profile = (sessionPayload.user ?? {}) as BusinessProfile;
      const calculatedLines = (purchase.items ?? []).map((item) => ({
        ...item,
        ...calculatePurchaseItemAmount({
          quantity: numeric(item.quantity),
          sellRate: numeric(item.sellRate),
          discountPercentage: numeric(item.discountPercentage),
          gst: numeric(item.gst),
        }),
      }));
      const calculatedTotals = {
        totalQuantity: (purchase.items ?? []).reduce((sum, item) => sum + numeric(item.quantity), 0),
        freeQuantity: (purchase.items ?? []).reduce((sum, item) => sum + numeric(item.freeQuantity), 0),
        ...calculatePurchaseOrderSummary((purchase.items ?? []).map((item) => ({
          quantity: numeric(item.quantity),
          sellRate: numeric(item.sellRate),
          discountPercentage: numeric(item.discountPercentage),
          gst: numeric(item.gst),
        }))),
      };

      setRecord(purchase);
      setBusiness(profile);
      setMenuOpen(false);
      if (action === "download-pdf") {
        await downloadPdf(purchase, profile, calculatedLines, calculatedTotals);
        return;
      }
      setMode(action === "print-bill" ? "bill" : action === "print-service" ? "service" : "ai");
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Unable to prepare the purchase bill.");
    } finally {
      setLoading(false);
    }
  }

  if (!record) {
    return (
      <>
        <button type="button" className="btn btn-sm btn-light" title="Print options" aria-label="Print options" onClick={() => { setMenuOpen(true); setError(""); }}>
          <i className="bi bi-printer" aria-hidden="true" />
        </button>
        {menuOpen && <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) setMenuOpen(false); }}>
          <section className={`${styles.actionDialog} card border-0 shadow-lg`} role="dialog" aria-modal="true" aria-labelledby={`print-menu-${orderId}`}>
            <div className="d-flex align-items-start justify-content-between mb-3">
              <div><span className={styles.eyebrow}>Purchase Order</span><h2 id={`print-menu-${orderId}`} className="h5 mb-0 mt-1">Print options</h2></div>
              <button type="button" className="btn-close" aria-label="Close" disabled={loading} onClick={() => setMenuOpen(false)} />
            </div>
            <div className="d-grid gap-2">
              <button type="button" className="btn btn-light text-start" disabled={loading} onClick={() => void chooseAction("print-bill")}><i className="bi bi-printer me-2 text-primary" aria-hidden="true" />Print Bill</button>
              <button type="button" className="btn btn-light text-start" disabled={loading} onClick={() => void chooseAction("print-service")}><i className="bi bi-receipt me-2 text-success" aria-hidden="true" />Print Service Bill</button>
              <button type="button" className="btn btn-light text-start" disabled={loading} onClick={() => void chooseAction("ai-view")}><i className="bi bi-stars me-2 text-warning" aria-hidden="true" />AI View</button>
              <button type="button" className="btn btn-light text-start" disabled={loading} onClick={() => void chooseAction("download-pdf")}><i className="bi bi-file-earmark-pdf me-2 text-danger" aria-hidden="true" />Download PDF</button>
            </div>
            {loading && <div className="small text-secondary mt-3" role="status"><span className="spinner-border spinner-border-sm me-2" />Preparing bill…</div>}
            {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
          </section>
        </div>}
      </>
    );
  }

  const voucher = record.voucherNumber ?? record.purchaseOrderNumber ?? record.id;
  const businessName = business.businessName || business.name || "MediStore";
  const supplierAddress = addressLine(supplier);

  return (
    <>
      <button type="button" className="btn btn-sm btn-light" title="Print options" aria-label="Print options" onClick={() => setMenuOpen(true)}>
        <i className="bi bi-printer" aria-hidden="true" />
      </button>
      {menuOpen && <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) setMenuOpen(false); }}>
        <section className={`${styles.actionDialog} card border-0 shadow-lg`} role="dialog" aria-modal="true" aria-labelledby={`print-menu-${orderId}`}>
          <div className="d-flex align-items-start justify-content-between mb-3">
            <div><span className={styles.eyebrow}>Purchase Order</span><h2 id={`print-menu-${orderId}`} className="h5 mb-0 mt-1">Print options</h2></div>
            <button type="button" className="btn-close" aria-label="Close" disabled={loading} onClick={() => setMenuOpen(false)} />
          </div>
          <div className="d-grid gap-2">
            <button type="button" className="btn btn-light text-start" disabled={loading} onClick={() => void chooseAction("print-bill")}><i className="bi bi-printer me-2 text-primary" aria-hidden="true" />Print Bill</button>
            <button type="button" className="btn btn-light text-start" disabled={loading} onClick={() => void chooseAction("print-service")}><i className="bi bi-receipt me-2 text-success" aria-hidden="true" />Print Service Bill</button>
            <button type="button" className="btn btn-light text-start" disabled={loading} onClick={() => void chooseAction("ai-view")}><i className="bi bi-stars me-2 text-warning" aria-hidden="true" />AI View</button>
            <button type="button" className="btn btn-light text-start" disabled={loading} onClick={() => void chooseAction("download-pdf")}><i className="bi bi-file-earmark-pdf me-2 text-danger" aria-hidden="true" />Download PDF</button>
          </div>
          {loading && <div className="small text-secondary mt-3" role="status"><span className="spinner-border spinner-border-sm me-2" />Preparing bill…</div>}
          {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
        </section>
      </div>}

      {mode === "ai" && <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMode(null); }}>
        <section className={styles.aiShell} role="dialog" aria-modal="true" aria-labelledby="purchase-ai-title">
          <header className={styles.aiToolbar}>
            <div className="d-flex align-items-center gap-3"><span className={styles.brandMark}><i className="bi bi-capsule-pill" aria-hidden="true" /></span><div><div className={styles.eyebrow}>MediStore · Purchase</div><h2 id="purchase-ai-title" className="h5 mb-0">Purchase Bill <span className="text-secondary fw-normal">#{voucher}</span></h2></div></div>
            <div className="d-flex align-items-center gap-2"><button type="button" className="btn btn-primary btn-sm" onClick={() => setMode("bill")}><i className="bi bi-printer me-1" />Print</button><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setMode("service")}><i className="bi bi-receipt me-1" />Service Bill</button><button type="button" className="btn btn-light btn-sm" aria-label="Close preview" onClick={() => setMode(null)}><i className="bi bi-x-lg" /></button></div>
          </header>
          <div className={styles.aiContent}>
            <div className={styles.aiHero}>
              <div><span className={styles.eyebrow}>Purchase Bill</span><h1 className="h3 mb-2">Voucher #{voucher}</h1><div className="text-secondary">Supplier: {supplier?.firmName || "-"} <span className="mx-2">·</span>Bill Date: {date(record.billDate)}</div></div>
              <div className={styles.totalCard}><div className={styles.totalLabel}>TOTAL BILL</div><div className={styles.totalValue}>{currency(totals.grandTotal)}</div><div className={styles.totalHint}>Including taxes and discounts</div></div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-lg-4"><section className={styles.infoCard}><div className={styles.cardHeading}><i className="bi bi-building" />Supplier Details</div><h3>{supplier?.firmName || "Supplier"}</h3><div>{supplier?.ownerName || "-"}</div><div className="mt-2">{supplierAddress}</div><div className="mt-2">Mobile: {display(supplier?.phone)}</div><div>Email: {display(supplier?.email)}</div><div>GST: {supplier?.registeredGSTN ? display(supplier.gstnNumber) : "-"}</div><div>Drug License: {display(supplier?.drugLicenceNumber)}</div></section></div>
              <div className="col-lg-4"><section className={styles.infoCard}><div className={styles.cardHeading}><i className="bi bi-person-vcard" />Customer / Party Details</div><h3>{businessName}</h3><div>{addressLine(business)}</div><div className="mt-2">Mobile: {display(business.mobile)}</div><div>Email: {display(business.email)}</div><div>GST: {display(business.gstNumber)}</div><div>Drug License: {display(business.drugLicenseNumber)}</div></section></div>
              <div className="col-lg-4"><section className={styles.infoCard}><div className={styles.cardHeading}><i className="bi bi-receipt-cutoff" />Bill Information</div><dl className={styles.infoGrid}><dt>Voucher Number</dt><dd>{voucher}</dd><dt>Bill Number</dt><dd>{display(record.billNumber)}</dd><dt>Bill Date</dt><dd>{date(record.billDate)}</dd><dt>Order Date</dt><dd>{date(record.orderDate)}</dd><dt>Payment Type</dt><dd>{display(record.paymentMethod)}</dd><dt>LR Number</dt><dd>{display(record.lrNumber)}</dd><dt>Dispatch Date</dt><dd>{date(record.dispatchDate)}</dd><dt>Godown</dt><dd>{display(record.godown)}</dd></dl></section></div>
            </div>
            <section className={styles.productsCard}><div className={styles.cardHeading}><i className="bi bi-box-seam" />Product Details <span className="badge text-bg-light ms-1">{lines.length} items</span></div><div className="table-responsive"><PurchaseBillTable lines={lines} totals={totals} variant="preview" /></div><BillBottomSection totals={totals} supplierName={supplier?.firmName || businessName} /></section>
            <section className={`${styles.infoCard} mt-3`}><div className={styles.cardHeading}><i className="bi bi-truck" />Terms / Notes</div><div className="row g-3"><div className="col-sm-6"><div className={styles.miniLabel}>Delivery Address</div><div>{display(record.deliveryAddress)}</div></div><div className="col-sm-6"><div className={styles.miniLabel}>Payment</div><div>{display(record.paymentMethod)} · {display(record.paymentTerms)}</div></div><div className="col-12"><div className={styles.miniLabel}>Remarks</div><div>{display(record.remarks)}</div></div></div></section>
          </div>
        </section>
      </div>}

      {(mode === "bill" || mode === "service") && <article id="purchase-print-root" className={`${styles.printDocument} ${mode === "service" ? styles.serviceDocument : ""}`}>
        <header className={styles.printHeader}><div className={styles.printBrand}><span className={styles.printLogo}><i className="bi bi-capsule-pill" /></span><div><h1>{supplier?.firmName || "Supplier"}</h1><p>{supplierAddress}</p><p>Mobile: {display(supplier?.phone)} · Email: {display(supplier?.email)}</p><p>GST: {supplier?.registeredGSTN ? display(supplier.gstnNumber) : "-"} · Drug License: {display(supplier?.drugLicenceNumber)}</p></div></div><div className={styles.printHeading}><h2>{mode === "service" ? "SERVICE BILL" : "PURCHASE BILL"}</h2>{mode === "service" && <strong>Service Bill Number: SRV-{voucher}</strong>}<strong>Voucher #{voucher}</strong><div>Bill No: {display(record.billNumber)}</div></div></header>
        <section className={styles.printInfoGrid}><div><h3>Supplier Details</h3><strong>{supplier?.firmName || "Supplier"}</strong><p>{supplierAddress}</p><p>Mobile: {display(supplier?.phone)}</p><p>Email: {display(supplier?.email)}</p><p>GST: {supplier?.registeredGSTN ? display(supplier.gstnNumber) : "-"}</p><p>Drug License: {display(supplier?.drugLicenceNumber)}</p></div><div><h3>Customer / Party Details</h3><strong>{businessName}</strong><p>{addressLine(business)}</p><p>Mobile: {display(business.mobile)}</p><p>Email: {display(business.email)}</p><p>GST: {display(business.gstNumber)}</p><p>Drug License: {display(business.drugLicenseNumber)}</p></div><div><h3>Bill Information</h3><p>Voucher Number: {voucher}</p><p>Bill Number: {display(record.billNumber)}</p><p>Bill Date: {date(record.billDate)}</p><p>Order Date: {date(record.orderDate)}</p><p>Payment Type: {display(record.paymentMethod)}</p>{mode === "bill" && <><p>LR Number: {display(record.lrNumber)}</p><p>Dispatch Date: {date(record.dispatchDate)}</p><p>Godown: {display(record.godown)}</p></>}</div></section>
        {mode === "bill" ? <PurchaseBillTable lines={lines} totals={totals} variant="print" /> : <ServiceBillTable lines={lines} totals={totals} />}
        <BillBottomSection totals={totals} supplierName={supplier?.firmName || "Supplier"} />
        <section className={styles.printNotes}><strong>Terms / Notes</strong><div>Delivery Address: {display(record.deliveryAddress)}</div><div>Payment: {display(record.paymentMethod)} · {display(record.paymentTerms)}</div>{record.remarks && <div>Remarks: {display(record.remarks)}</div>}</section>
        <footer className={styles.printFooter}>This is a computer-generated {mode === "service" ? "service bill" : "purchase bill"} from {supplier?.firmName || "Supplier"}.</footer>
      </article>}
    </>
  );
}
