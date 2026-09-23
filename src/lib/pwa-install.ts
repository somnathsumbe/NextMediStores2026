export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "medistores-pwa-install-dismissed";
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribePwaInstall(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function capturePwaInstallPrompt(event: Event) {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  notify();
}

export function markPwaInstalled() {
  installed = true;
  deferredPrompt = null;
  notify();
}

export function hasPwaInstallPrompt() {
  return deferredPrompt !== null;
}

export function isPwaInstalled() {
  if (installed) return true;
  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

export function wasPwaInstallDismissed() {
  try { return window.localStorage.getItem(DISMISSED_KEY) === "1"; } catch { return false; }
}

export function dismissPwaInstall() {
  try { window.localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* Storage can be unavailable in private mode. */ }
  notify();
}

export function reopenPwaInstall() {
  try { window.localStorage.removeItem(DISMISSED_KEY); } catch { /* Ignore unavailable storage. */ }
  notify();
}

export async function promptPwaInstall() {
  if (!deferredPrompt) return null;
  const prompt = deferredPrompt;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  deferredPrompt = null;
  notify();
  if (choice.outcome === "accepted") markPwaInstalled();
  return choice.outcome;
}
