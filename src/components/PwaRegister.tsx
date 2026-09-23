"use client";
import { useEffect } from "react";
import { capturePwaInstallPrompt, markPwaInstalled } from "@/lib/pwa-install";
export default function PwaRegister() {
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => capturePwaInstallPrompt(event);
    const handleInstalled = () => markPwaInstalled();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleInstalled);
      };
    }
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifest) {
      const workerUrl = new URL("./sw.js", manifest.href).href;
      navigator.serviceWorker.register(workerUrl).catch(() => undefined);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);
  return null;
}
