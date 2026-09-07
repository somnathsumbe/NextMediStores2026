"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { mockService } from "@/lib/mock-service";

export type Column = { key: string; label: string };

export function PageHeader({ title, subtitle, action, href }: { title: string; subtitle?: string; action?: string; href?: string }) {
  return (
    <header className="page-header d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div><h1 className="page-title">{title}</h1>{subtitle && <p className="muted mb-0 mt-1">{subtitle}</p>}</div>
      {action && href && <Link href={href} className="btn btn-brand"><i className="bi bi-plus-lg me-2" aria-hidden="true" />{action}</Link>}
    </header>
  );
}

export function Status({ value }: { value: string }) {
  const text = value || "Unknown";
  const lower = text.toLowerCase();
  const cls = lower.includes("active") || lower.includes("delivered") || lower.includes("received") || lower.includes("in stock")
    ? "badge-success" : lower.includes("pending") || lower.includes("processing") || lower.includes("low") ? "badge-warning" : "badge-danger";
  return <span className={`badge-soft ${cls}`}>{text}</span>;
}

function displayValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (["amount", "purchasePrice", "salePrice"].includes(key)) return `₹${Number(value).toLocaleString("en-IN")}`;
  return String(value);
}

export function DataTable({ collection, columns, searchPlaceholder = "Search records...", actions = true }: { collection: string; columns: Column[]; searchPlaceholder?: string; actions?: boolean }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => setRows(mockService.get<Record<string, unknown>>(collection)), [collection]);
  const filtered = useMemo(() => rows.filter(r => Object.values(r).join(" ").toLowerCase().includes(q.toLowerCase())), [rows, q]);

  return <section className="card table-card" aria-label={`${collection} table`}>
    <div className="table-toolbar p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
      <label className="search mb-0 flex-grow-1" style={{ maxWidth: 430 }}><i className="bi bi-search" aria-hidden="true" /><span className="visually-hidden">Search</span><input value={q} onChange={e => setQ(e.target.value)} placeholder={searchPlaceholder} /></label>
      <span className="muted" aria-live="polite">{filtered.length} records</span>
    </div>
    <div className="table-responsive">
      <table className="table mb-0"><thead><tr>{columns.map(c => <th scope="col" key={c.key}>{c.label}</th>)}{actions && <th scope="col">Actions</th>}</tr></thead>
        <tbody>{filtered.map((r, i) => <tr key={String(r.id ?? i)}>{columns.map(c => <td key={c.key}>{c.key === "status" ? <Status value={String(r[c.key])} /> : displayValue(c.key, r[c.key])}</td>)}{actions && <td><button className="btn btn-sm btn-light me-1" aria-label={`Edit ${String(r.name ?? r.id ?? "record")}`}><i className="bi bi-pencil" aria-hidden="true" /></button><button className="btn btn-sm btn-light" aria-label="More actions"><i className="bi bi-three-dots" aria-hidden="true" /></button></td>}</tr>)}</tbody>
      </table>
    </div>
  </section>;
}

export function MasterPage({ title, collection, columns, subtitle }: { title: string; collection: string; columns: Column[]; subtitle: string }) {
  return <div className="page"><PageHeader title={title} subtitle={subtitle} action={`Add ${title.replace(" Master", "")}`} href="#add" /><DataTable collection={collection} columns={columns} /></div>;
}
