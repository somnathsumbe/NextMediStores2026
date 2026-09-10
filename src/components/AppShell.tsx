"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/auth/auth.service";

const nav = [
  ["Dashboard", "/dashboard", "bi-grid-1x2"],
  ["Add Product", "/products/add", "bi-plus-circle"],
  ["Sales Orders", "/sales-orders", "bi-cart-check"],
  ["Purchase Orders", "/purchase-orders", "bi-bag-check"],
  ["Transactions", "/transactions", "bi-arrow-left-right"],
  ["Reports", "/reports", "bi-bar-chart"],
  ["Invoice", "/invoice", "bi-receipt"],
  ["Users", "/users", "bi-person-gear"],
  ["Profile", "/profile", "bi-person-circle"],
];
const masterNav = [
  ["Bank Details", "/bankinfo", "bi-bank"],
  ["Party", "/parties", "bi-people"],
  ["Products", "/products", "bi-capsule"],
  ["Transport", "/masters/transport", "bi-truck"],
  ["HSN", "/masters/hsn", "bi-upc-scan"],
  ["Category", "/masters/category", "bi-tags"],
  ["Brand Master", "/masters/brand", "bi-award"],
];
export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const masterActive = masterNav.some(([, href]) => path === href || path.startsWith(`${href}/`));
  const [masterOpen, setMasterOpen] = useState(masterActive);
  const [auth, setAuth] = useState<boolean | null>(null);
  useEffect(() => { setAuth(authService.isAuthenticated()); }, [path]);
  useEffect(() => {
    if (masterActive) setMasterOpen(true);
  }, [masterActive]);
  useEffect(() => { if (auth === false) router.replace("/login"); }, [auth, router]);
  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await authService.logout();
    router.replace("/login");
    router.refresh();
  }
  if (auth === null || auth === false) return <div className="p-5 text-center">Loading MediStores...</div>;
  return (
    <>
      <div className="app">
        <aside
          className={"sidebar " + (open ? "open" : "")}
          aria-label="Primary navigation"
        >
          <div className="brand">
            <i className="bi bi-capsule-pill"></i>MediStores
          </div>
          <div className="profile">
            <div className="avatar">MR</div>
            <div>
              <b>Medical Sales</b>
              <small className="d-block">Field Representative</small>
            </div>
          </div>
          <div className="nav-section">Workspace</div>
          <button
            type="button"
            className={"side-link w-100 border-0 bg-transparent text-start " + (masterActive ? "active" : "")}
            onClick={() => setMasterOpen(value => !value)}
            aria-expanded={masterOpen}
            aria-controls="master-submenu"
          >
            <i className="bi bi-collection" aria-hidden="true"></i>
            <span className="flex-grow-1">Master</span>
            <i className={"bi " + (masterOpen ? "bi-chevron-up" : "bi-chevron-down")} aria-hidden="true"></i>
          </button>
          {masterOpen && (
            <div id="master-submenu" className="ms-3 ps-2 border-start border-light-subtle">
              {masterNav.map(([label, href, icon]) => (
                <Link
                  key={href}
                  onClick={() => { setOpen(false); setMasterOpen(true); }}
                  className={"side-link " + (path === href || path.startsWith(`${href}/`) ? "active" : "")}
                  href={href}
                >
                  <i className={"bi " + icon}></i>
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          )}
          {nav.map(([label, href, icon]) => (
            <Link
              key={href}
              onClick={() => setOpen(false)}
              className={"side-link " + (path === href ? "active" : "")}
              href={href}
            >
              <i className={"bi " + icon}></i>
              <span>{label}</span>
            </Link>
          ))}
          <div className="nav-section">Account</div>
          <button className="side-link w-100 border-0 bg-transparent text-start" onClick={() => void handleLogout()} disabled={loggingOut}>
            <i className="bi bi-box-arrow-right" />{loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </aside>
        <main className="main">
          <header className="topbar" aria-label="Application header">
            <div className="d-flex align-items-center gap-3">
              <button
                aria-label="Open navigation menu"
                className="btn icon-btn mobile-toggle"
                onClick={() => setOpen(!open)}
              >
                <i className="bi bi-list"></i>
              </button>
              <div className="search">
                <i className="bi bi-search"></i>
                <input
                  aria-label="Search medicines, orders and customers"
                  placeholder="Search medicines, orders, customers..."
                />
              </div>
            </div>
            <div className="top-actions">
              <button className="icon-btn" aria-label="Notifications">
                <i className="bi bi-bell" aria-hidden="true"></i>
              </button>
              <div className="d-flex align-items-center gap-2">
                <div className="avatar" style={{ width: 34, height: 34 }}>
                  MR
                </div>
                <span className="hide-sm fw-semibold">
                  Medical Representative
                </span>
              </div>
            </div>
          </header>
          {children}
        </main>
        <footer className="footer">
          © 2026 MediStores · Medical distribution & field sales management
        </footer>
      </div>
    </>
  );
}
