"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, Status } from "@/components/ui";
import { mockService } from "@/lib/mock-service";
import type { SalesOrderRecord } from "@/components/OrderPurchaseForm";

export default function SalesOrders() {
	const [orders, setOrders] = useState<SalesOrderRecord[]>([]);
	const [query, setQuery] = useState("");
	useEffect(() => setOrders(mockService.get<SalesOrderRecord>("salesOrders")), []);
	const filtered = orders.filter((order) => JSON.stringify(order).toLowerCase().includes(query.toLowerCase()));

	return <div className="page"><PageHeader title="Sales Orders" subtitle="Customer orders and saved bill details" action="New Sales Bill" href="/sales-orders/new" />
		<section className="card table-card"><div className="table-toolbar p-3 border-bottom d-flex justify-content-between align-items-center gap-2"><label className="search mb-0 flex-grow-1" style={{ maxWidth: 430 }}><i className="bi bi-search" /><span className="visually-hidden">Search sales bills</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bills, customer or salesman" /></label><span className="muted">{filtered.length} bills</span></div>
			<div className="table-responsive"><table className="table mb-0"><thead><tr><th>Bill</th><th>Date</th><th>Customer</th><th>Salesman</th><th>Total</th><th>Status</th><th className="text-end">Actions</th></tr></thead><tbody>{filtered.map((order) => <tr key={order.id}><td>#{order.billNumber || order.id}</td><td>{order.billDate || order.orderDate || "—"}</td><td>{order.partnerId || "—"}</td><td>{order.salesmanFullName || "—"}</td><td>₹{Number(order.total ?? 0).toLocaleString("en-IN")}</td><td><Status value={order.status || "Completed"} /></td><td className="text-end"><Link className="btn btn-sm btn-light me-1" href={`/invoice?id=${order.id}`} aria-label={`Preview bill ${order.id}`}><i className="bi bi-eye" /></Link><Link className="btn btn-sm btn-outline-secondary" href={`/sales-orders/${order.id}/edit`} aria-label={`Edit bill ${order.id}`}><i className="bi bi-pencil" /></Link></td></tr>)}{filtered.length === 0 && <tr><td colSpan={7} className="text-center text-muted py-4">No saved sales bills found.</td></tr>}</tbody></table></div>
		</section></div>;
}
