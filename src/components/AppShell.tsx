"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/services/auth/auth.service";

type MenuLink = [string, string, string];
type MenuGroup = { key: string; label: string; icon: string; links: MenuLink[] };

const menuGroups: MenuGroup[] = [
  {
    key: "masters",
    label: "Masters",
    icon: "bi-collection",
    links: [
      ["Salesman", "/masters/salesman", "bi-person-badge"],
      ["HSN", "/masters/hsn", "bi-upc-scan"],
      ["Party", "/parties", "bi-people"],
      ["Bank Details", "/bankinfo", "bi-bank"],
      ["Product", "/products", "bi-capsule"],
      ["Transport", "/masters/transport", "bi-truck"],
    ],
  },
  {
    key: "order",
    label: "Order",
    icon: "bi-bag-check",
    links: [
      ["Purchase", "/orders", "bi-bag-plus"],
      ["Sales", "/sales-orders", "bi-cart-check"],
    ],
  },
  {
    key: "billing",
    label: "Billing",
    icon: "bi-receipt",
    links: [["Invoice", "/invoice", "bi-receipt-cutoff"]],
  },
  {
    key: "reports",
    label: "Reports",
    icon: "bi-bar-chart",
    links: [
      ["Payable", "/reports?section=payable", "bi-wallet2"],
      ["Receivable", "/reports?section=receivable", "bi-cash-stack"],
      ["Outstanding", "/reports?section=outstanding", "bi-hourglass-split"],
      ["Account", "/reports?section=account", "bi-person-vcard"],
      ["GST / Tax", "/reports?section=gst-tax", "bi-percent"],
      ["Sales", "/reports?section=sales", "bi-graph-up-arrow"],
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: "bi-gear",
    links: [
      ["Profile", "/profile", "bi-person-circle"],
    ],
  },
];

function pathMatches(path: string, href: string) {
  const route = href.split("?")[0];
  return path === route || path.startsWith(`${route}/`);
}

function groupForPath(path: string) {
  return menuGroups.find((group) => group.links.some(([, href]) => pathMatches(path, href)))?.key ?? null;
}

function getStoredUserName() {
  if (typeof window === "undefined") return "";
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const raw = storage.getItem("medistores_user");
    if (!raw) continue;
    try {
      const user = JSON.parse(raw) as { name?: string };
      return user.name?.trim() ?? "";
    } catch {
      return "";
    }
  }
  return "";
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const activeGroup = groupForPath(path);
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);
  const [auth, setAuth] = useState<boolean | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setAuth(authService.isAuthenticated());
    setUserName(getStoredUserName());
  }, [path]);
  useEffect(() => { if (activeGroup) setOpenGroup(activeGroup); }, [activeGroup]);
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
        <aside className={"sidebar " + (open ? "open" : "")} aria-label="Primary navigation">
          <div className="brand"><i className="bi bi-capsule-pill" />MediStores</div>
          <div className="nav-section">Navigation</div>
          <Link href="/dashboard" onClick={() => setOpen(false)} className={"side-link " + (pathMatches(path, "/dashboard") ? "active" : "")}><i className="bi bi-grid-1x2" /><span>Dashboard</span></Link>
          {menuGroups.map((group) => (
            <div key={group.key}>
              <button type="button" className={"side-link w-100 border-0 bg-transparent text-start " + (activeGroup === group.key ? "active" : "")} onClick={() => setOpenGroup((current) => current === group.key ? null : group.key)} aria-expanded={openGroup === group.key} aria-controls={`${group.key}-submenu`}>
                <i className={`bi ${group.icon}`} aria-hidden="true" /><span className="flex-grow-1">{group.label}</span><i className={`bi ${openGroup === group.key ? "bi-chevron-up" : "bi-chevron-down"}`} aria-hidden="true" />
              </button>
              {openGroup === group.key && <div id={`${group.key}-submenu`} className="ms-3 ps-2 border-start border-light-subtle">{group.links.map(([label, href, icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={"side-link " + (pathMatches(path, href) ? "active" : "")}><i className={`bi ${icon}`} aria-hidden="true" /><span>{label}</span></Link>)}</div>}
            </div>
          ))}
          <div className="nav-section">Account</div>
          <button className="side-link w-100 border-0 bg-transparent text-start" onClick={() => void handleLogout()} disabled={loggingOut}><i className="bi bi-box-arrow-right" aria-hidden="true" />{loggingOut ? "Signing Out..." : "Sign Out"}</button>
        </aside>
        <main className="main">
          <header className="topbar" aria-label="Application header"><button aria-label="Open navigation menu" className="btn icon-btn mobile-toggle" onClick={() => setOpen(!open)}><i className="bi bi-list" /></button><div className="top-actions"><button className="icon-btn" aria-label="Notifications"><i className="bi bi-bell" aria-hidden="true" /></button>{userName && <div className="header-user-avatar" title={userName} aria-label={userName}>{getInitials(userName)}</div>}<button className="icon-btn" type="button" aria-label="Sign Out" title="Sign Out" onClick={() => void handleLogout()} disabled={loggingOut}><i className="bi bi-box-arrow-right" aria-hidden="true" /></button></div></header>
          {children}
        </main>
        <footer className="footer">© 2026 MediStores · Medical distribution &amp; field sales management</footer>
      </div>
    </>
  );
}
