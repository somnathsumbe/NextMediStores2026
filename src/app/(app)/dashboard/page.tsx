"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {mockService} from "@/lib/mock-service";
import {PageHeader,Status} from "@/components/ui";
export default function Dashboard(){
 const [p,setP]=useState<any[]>([]),[sales,setSales]=useState<any[]>([]),[tx,setTx]=useState<any[]>([]);
 useEffect(()=>{setP(mockService.get("products"));setSales(mockService.get("salesOrders"));setTx(mockService.get("transactions"))},[]);
 const low=p.filter(x=>x.stock<=x.minStock), salesTotal=sales.reduce((a,x)=>a+x.amount,0), purchases=mockService.get<any>("purchaseOrders").reduce((a,x)=>a+x.amount,0);
 const stats=[["Products",p.length,"bi-capsule","View products","/products"],["Sales today",`₹${salesTotal.toLocaleString("en-IN")}`,"bi-graph-up-arrow","Sales orders","/sales-orders"],["Purchases",`₹${purchases.toLocaleString("en-IN")}`,"bi-bag-check","Purchase orders","/purchase-orders"],["Low stock",low.length,"bi-exclamation-triangle","Review stock","/products"]];
 return <div className="page"><PageHeader title="Dashboard" subtitle="Overview of your medical distribution business"/>
 <div className="row g-3 mb-4">{stats.map(s=><div className="col-xl-3 col-md-6" key={s[0] as string}><div className="card stat h-100"><div className="d-flex justify-content-between"><div><div className="muted">{s[0]}</div><h3>{s[1]}</h3><Link className="small text-primary" href={s[4] as string}>{s[3] as string} →</Link></div><div className="icon"><i className={"bi "+s[2]}></i></div></div></div></div>)}</div>
 <div className="row g-3"><div className="col-lg-8"><div className="card table-card"><div className="p-3 border-bottom d-flex justify-content-between"><b>Recent Sales Orders</b><Link href="/sales-orders" className="small text-primary">View all</Link></div><div className="table-responsive"><table className="table mb-0"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{sales.map(x=><tr key={x.id}><td className="fw-semibold">{x.id}</td><td>{x.party}</td><td>{x.date}</td><td>₹{x.amount.toLocaleString("en-IN")}</td><td><Status value={x.status}/></td></tr>)}</tbody></table></div></div></div>
 <div className="col-lg-4"><div className="card"><div className="p-3 border-bottom"><b>Low Stock Alerts</b></div><div className="p-3">{low.length?low.map(x=><div className="d-flex justify-content-between py-2 border-bottom" key={x.id}><div><b>{x.name}</b><small className="d-block muted">{x.code}</small></div><span className="badge-soft badge-danger">{x.stock} left</span></div>):<div className="text-center muted py-4">All stock levels are healthy.</div>}<Link href="/products" className="btn btn-light w-100 mt-3">Manage inventory</Link></div></div></div></div>
 <div className="card mt-3 p-3"><b className="d-block mb-3">Recent Transactions</b>{tx.map(x=><div className="d-flex justify-content-between border-bottom py-2" key={x.id}><span><b>{x.type}</b> · {x.party}<small className="muted ms-2">{x.reference}</small></span><b>₹{x.amount.toLocaleString("en-IN")}</b></div>)}</div>
 </div>
}
