"use client";

import { useEffect, useState } from "react";
import {
  hasPwaInstallPrompt,
  isPwaInstalled,
  promptPwaInstall,
  subscribePwaInstall,
} from "@/lib/pwa-install";

export default function InstallPwaButton() {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const update = () => {
      setInstalled(isPwaInstalled());
      setHasPrompt(hasPwaInstallPrompt());
    };

    update();
    setReady(true);
    return subscribePwaInstall(update);
  }, []);

  async function install() {
    if (!hasPrompt || installing) return;
    setInstalling(true);
    await promptPwaInstall();
    setInstalling(false);
  }

  if (!ready || installed) return null;

  return (
    <button
      type="button"
      className="btn btn-outline-primary w-100 mt-3"
      onClick={() => void install()}
      disabled={!hasPrompt || installing}
    >
      <i className="bi bi-download me-2" aria-hidden="true" />
      {installing ? "Opening..." : "Install App"}
    </button>
  );
}
