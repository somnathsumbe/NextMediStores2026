"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { mockService } from "@/lib/mock-service";
import type { SalesOrderRecord } from "@/components/OrderPurchaseForm";

function money(value: unknown) {
	return `₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Invoice() {
	const searchParams = useSearchParams();
	const [bill, setBill] = useState<SalesOrderRecord | null>(null);

	useEffect(() => {
		const id = searchParams.get("id");
		if (id) setBill(mockService.get<SalesOrderRecord>("salesOrders").find((item) => String(item.id) === id) ?? null);
	}, [searchParams]);

	const subtotal = bill ? Number(bill.rate ?? 0) * Number(bill.quantity ?? 0) : 1500;
	const gst = bill ? Number(bill.gstAmount ?? 0) : 180;
	const discount = bill ? Number(bill.discountAmount ?? 0) : 0;
	const total = bill ? Number(bill.total ?? subtotal + gst - discount) : 1680;

	return <div className="page"><PageHeader title="Invoice" subtitle="Preview, print or save the bill as PDF" />
		<div className="card p-4" id="invoice"><div className="d-flex justify-content-between border-bottom pb-4"><div><h3 className="text-primary">MediStores</h3><div className="muted">Medical Distribution & Sales</div></div><div className="text-end"><b>Tax Invoice</b><div>{bill?.billNumber || "INV-2026-001"}</div><div className="muted">{bill?.billDate || "07 Sep 2026"}</div></div></div>
			<div className="row my-4"><div className="col-md-6"><small className="muted">BILL TO</small><h6 className="mt-1">{bill?.partnerId || "Apollo Pharmacy"}</h6><div>{bill?.deliveryAddress || "Pune, Maharashtra"}</div></div><div className="col-md-6 text-md-end mt-3 mt-md-0"><small className="muted">BILL DETAILS</small><div>Order: {bill?.id ? `SO-${bill.id}` : "SO-1001"}</div><div className="mt-2">Salesman: <strong>{bill?.salesmanFullName || "—"}</strong></div></div></div>
			<div className="table-responsive"><table className="table"><thead><tr><th>#</th><th>Medicine</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody><tr><td>1</td><td>{bill?.productId || "Paracetamol 500mg"}</td><td>{bill?.quantity ?? 100}</td><td>{money(bill?.rate ?? 4)}</td><td>{money(subtotal)}</td></tr></tbody><tfoot><tr><th colSpan={4} className="text-end">Subtotal</th><th>{money(subtotal)}</th></tr><tr><th colSpan={4} className="text-end">GST</th><th>{money(gst)}</th></tr>{discount > 0 && <tr><th colSpan={4} className="text-end">Discount</th><th>- {money(discount)}</th></tr>}<tr><th colSpan={4} className="text-end">Grand Total</th><th>{money(total)}</th></tr></tfoot></table></div>
			<div className="d-flex justify-content-end gap-2"><button type="button" onClick={() => window.print()} className="btn btn-primary"><i className="bi bi-printer me-2" />Print / Save PDF</button></div>
		</div></div>;
}
