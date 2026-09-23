"use client";

import { useEffect, useState } from "react";
import { dismissPwaInstall, hasPwaInstallPrompt, isPwaInstalled, promptPwaInstall, reopenPwaInstall, subscribePwaInstall, wasPwaInstallDismissed } from "@/lib/pwa-install";

type Props = { variant?: "card" | "menu" };

function detectDevice() {
  const userAgent = window.navigator.userAgent || "";
  const ios = /iPad|iPhone|iPod/.test(userAgent) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const safari = ios && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return { ios, safari };
}

export default function InstallPwaButton({ variant = "card" }: Props) {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [ios, setIos] = useState(false);
  const [safari, setSafari] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState("");
  const [iconSrc, setIconSrc] = useState("/assets/images/favicon.png");

  useEffect(() => {
    const update = () => { setInstalled(isPwaInstalled()); setDismissed(wasPwaInstallDismissed()); setHasPrompt(hasPwaInstallPrompt()); };
    const device = detectDevice();
    setIos(device.ios); setSafari(device.safari); update(); setReady(true);
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifest) setIconSrc(new URL("assets/images/favicon.png", manifest.href).pathname);
    return subscribePwaInstall(update);
  }, []);

  async function install() {
    if (ios) { setGuideOpen(true); return; }
    if (!hasPrompt) { setMessage("या browser मध्ये install पर्याय अजून उपलब्ध नाही. Chrome मध्ये ही लिंक उघडा किंवा browser menu तपासा."); return; }
    setInstalling(true);
    const outcome = await promptPwaInstall();
    setInstalling(false);
    if (outcome === "dismissed") setMessage("Install रद्द झाले. तुम्ही नंतर पुन्हा प्रयत्न करू शकता.");
  }

  function dismiss() { dismissPwaInstall(); setDismissed(true); setGuideOpen(false); }
  if (!ready || installed) return null;

  if (variant === "menu") return <div className="pwa-menu-install"><button type="button" className="side-link w-100 border-0 bg-transparent text-start" onClick={() => { reopenPwaInstall(); setGuideOpen((value) => !value); }}><i className="bi bi-phone me-1" aria-hidden="true" /><span>अ‍ॅप इन्स्टॉल करा</span></button>{guideOpen && <div className="pwa-menu-guide" role="dialog" aria-label="अ‍ॅप इन्स्टॉल करा"><InstallContent ios={ios} safari={safari} hasPrompt={hasPrompt} installing={installing} message={message} onInstall={() => void install()} onDismiss={dismiss} /></div>}</div>;
  if (dismissed && !guideOpen) return null;
  return <section className="pwa-install-card" aria-labelledby="pwa-install-title"><div className="pwa-install-heading"><img src={iconSrc} alt="MediStore app icon" /><div><h2 id="pwa-install-title">MediStore मोबाइलवर इन्स्टॉल करा</h2><p>जलद उघडा, कमी data वापरा आणि billing app सारखे वापरा.</p></div></div><InstallContent ios={ios} safari={safari} hasPrompt={hasPrompt} installing={installing} message={message} onInstall={() => void install()} onDismiss={dismiss} /></section>;
}

function InstallContent({ ios, safari, hasPrompt, installing, message, onInstall, onDismiss }: { ios: boolean; safari: boolean; hasPrompt: boolean; installing: boolean; message: string; onInstall: () => void; onDismiss: () => void }) {
  return <><div className={ios ? "pwa-ios-guide" : "pwa-android-guide"}>{ios ? <><p className="mb-2">{safari ? "Safari मध्ये खालील पायऱ्या करा:" : "iPhone वर install करण्यासाठी ही लिंक Safari मध्ये उघडा, मग:"}</p>{!safari && <p className="small text-muted mb-2"><i className="bi bi-compass me-1" />Browser menu मधून <strong>Open in Safari</strong> निवडा.</p>}<ol><li><i className="bi bi-box-arrow-up" /><span>Safari मधील <strong>Share</strong> चिन्हावर टॅप करा.</span></li><li><i className="bi bi-plus-square" /><span><strong>Add to Home Screen</strong> निवडा.</span></li><li><i className="bi bi-check2-circle" /><span><strong>Add</strong> टॅप करून MediStore उघडा.</span></li></ol></> : <p className="small text-muted mb-3">{hasPrompt ? "तुमच्या browser मध्ये install तयार आहे." : "Install पर्याय तयार होत आहे; तो उपलब्ध झाल्यावरच native prompt उघडेल."}</p>}</div>{message && <div className="alert alert-warning py-2 small" role="status">{message}</div>}<div className="d-flex gap-2 flex-wrap"><button type="button" className="btn btn-brand" onClick={onInstall} disabled={!ios && (!hasPrompt || installing)}><i className={`bi ${ios ? "bi-info-circle" : "bi-download"} me-2`} />{installing ? "उघडत आहे..." : ios ? "पायऱ्या दाखवा" : "इन्स्टॉल करा"}</button><button type="button" className="btn btn-link text-secondary" onClick={onDismiss}>नंतर</button></div></>;
}