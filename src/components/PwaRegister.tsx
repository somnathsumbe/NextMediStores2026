"use client";
import { useEffect } from "react";
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifest) return;
    const workerUrl = new URL(manifest.href).pathname.replace(/manifest\.webmanifest$/, "sw.js");
    navigator.serviceWorker.register(workerUrl).catch(() => undefined);
  }, []);
  return null;
}
