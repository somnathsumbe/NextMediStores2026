import type { Metadata, Viewport } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: { default: "MediStores", template: "%s | MediStores" },
  description: "Medical distribution, inventory, orders and field sales management",
  icons: { icon: "/assets/images/favicon.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2856d9" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
