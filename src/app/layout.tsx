import type { Metadata, Viewport } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const githubPagesPrefix = process.env.GITHUB_ACTIONS === "true" || process.env.NEXT_PUBLIC_GITHUB_PAGES === "true"
  ? "/NextMediStores2026"
  : "";

export const metadata: Metadata = {
  title: { default: "MediStores", template: "%s | MediStores" },
  description: "Medical distribution, inventory, orders and field sales management",
  manifest: `${githubPagesPrefix}/manifest.webmanifest`,
  icons: { icon: `${githubPagesPrefix}/assets/images/favicon.png` },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2856d9" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PwaRegister />{children}</body></html>;
}
