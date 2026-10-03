"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Smartphone } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstallCard() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
  });
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) {
      setHelp((current) => !current);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  };

  return (
    <div className="sbj-install-card flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eee4cf] text-[#765620]">
          {installed ? <CheckCircle2 size={20} aria-hidden="true" /> : <Smartphone size={20} aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <h5 className="text-sm font-bold text-slate-900">{installed ? "App installed" : "Install Sri Sai Balaji"}</h5>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">Open billing quickly from your Android home screen, in its own app window.</p>
          {help && !installed && (
            <p role="status" className="mt-2 text-xs leading-relaxed text-slate-700">
              In Chrome, open the menu (⋮) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </p>
          )}
        </div>
      </div>
      {!installed && (
        <button type="button" onClick={install} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#171915] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#303329] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b48743]">
          <Download size={16} aria-hidden="true" /> Install app
        </button>
      )}
    </div>
  );
}
