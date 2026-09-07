"use client";
import {useEffect,useState} from "react";
import {usePathname,useRouter} from "next/navigation";
import Link from "next/link";
import PwaRegister from "@/components/PwaRegister";
import {authService} from "@/services/auth/auth.service";

const nav=[["Dashboard","/dashboard","bi-grid-1x2"],["Products","/products","bi-capsule"],["Add Product","/products/add","bi-plus-circle"],["Customers / Suppliers","/parties","bi-people"],["Sales Orders","/sales-orders","bi-cart-check"],["Purchase Orders","/purchase-orders","bi-bag-check"],["Transactions","/transactions","bi-arrow-left-right"],["Reports","/reports","bi-bar-chart"],["Invoice","/invoice","bi-receipt"],["Category Master","/masters/category","bi-tags"],["Brand Master","/masters/brand","bi-award"],["HSN Master","/masters/hsn","bi-upc-scan"],["Transport Master","/masters/transport","bi-truck"],["Users","/users","bi-person-gear"],["Profile","/profile","bi-person-circle"],["Bank Details","/bankinfo","bi-bank"]];
export default function AppShell({children}:{children:React.ReactNode}){
 const path=usePathname(); const router=useRouter(); const [open,setOpen]=useState(false); const [auth,setAuth]=useState<boolean|null>(null);
 useEffect(()=>{setAuth(authService.isAuthenticated())},[]);
 const login=path==="/"||path==="/login"||path==="/forgot-password"||path==="/signup";
 useEffect(()=>{if(auth===false&&!login)router.replace("/login"); if(auth===true&&path==="/login")router.replace("/dashboard")},[auth,path,login,router]);
 if(login)return <>{children}</>;
 if(auth===null)return <div className="p-5 text-center">Loading MediStores…</div>;
 return <><PwaRegister /><div className="app"><aside className={"sidebar "+(open?"open":"")} aria-label="Primary navigation">
  <div className="brand"><i className="bi bi-capsule-pill"></i>MediStores</div>
  <div className="profile"><div className="avatar">MR</div><div><b>Medical Sales</b><small className="d-block">Field Representative</small></div></div>
  <div className="nav-section">Workspace</div>
  {nav.map(([label,href,icon])=><Link key={href} onClick={()=>setOpen(false)} className={"side-link "+(path===href?"active":"")} href={href}><i className={"bi "+icon}></i><span>{label}</span></Link>)}
  <div className="nav-section">Account</div>
    <button className="side-link w-100 border-0 bg-transparent text-start" onClick={()=>{authService.logout();setAuth(false);router.replace("/login")}}><i className="bi bi-box-arrow-right"></i>Sign out</button>
 </aside><main className="main"><header className="topbar" aria-label="Application header"><div className="d-flex align-items-center gap-3"><button aria-label="Open navigation menu" className="btn icon-btn mobile-toggle" onClick={()=>setOpen(!open)}><i className="bi bi-list"></i></button><div className="search"><i className="bi bi-search"></i><input aria-label="Search medicines, orders and customers" placeholder="Search medicines, orders, customers..." /></div></div><div className="top-actions"><button className="icon-btn" aria-label="Notifications"><i className="bi bi-bell" aria-hidden="true"></i></button><div className="d-flex align-items-center gap-2"><div className="avatar" style={{width:34,height:34}}>MR</div><span className="hide-sm fw-semibold">Medical Representative</span></div></div></header>{children}</main><footer className="footer">© 2026 MediStores · Medical distribution & field sales management</footer></div></> 
}
