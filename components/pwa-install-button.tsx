"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isStandalonePwa, subscribeToDisplayMode } from "@/lib/pwa-onboarding";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const serverStandalone = () => false;
const InstallContext = createContext({
  installed: false,
  installing: false,
  instructions: null as string | null,
  install: async () => {},
});

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const standalone = useSyncExternalStore(
    subscribeToDisplayMode,
    isStandalonePwa,
    serverStandalone,
  );
  const prompt = useRef<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [instructions, setInstructions] = useState<string | null>(null);

  useEffect(() => {
    function beforeInstall(event: Event) {
      event.preventDefault();
      prompt.current = event as InstallPrompt;
    }
    function appInstalled() {
      prompt.current = null;
      setInstalled(true);
      setInstructions(null);
    }
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, []);

  async function install() {
    if (installing || installed || standalone) return;
    setInstructions(null);
    const event = prompt.current;
    if (event) {
      prompt.current = null;
      setInstalling(true);
      try {
        await event.prompt();
        // Acceptance is not installation; wait for appinstalled before claiming success.
        await event.userChoice;
        return;
      } catch {
        // Offer manual instructions when the native prompt fails.
      } finally {
        setInstalling(false);
      }
    }
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);
    setInstructions(
      ios
        ? "In Safari, tap Share, then “Add to Home Screen”, and confirm Add."
        : "Open your browser menu and choose “Install app” or “Add to Home screen”. If neither appears, open Gym Ladder in Chrome or Edge.",
    );
  }

  return (
    <InstallContext.Provider
      value={{
        installed: standalone || installed,
        installing,
        instructions,
        install,
      }}
    >
      {children}
    </InstallContext.Provider>
  );
}

export function PwaInstallButton() {
  const { installed, installing, instructions, install } =
    useContext(InstallContext);
  if (installed) return null;

  return (
    <div className="space-y-3 lg:hidden">
      <Button
        variant="outline"
        className="min-h-12 w-full"
        disabled={installing}
        onClick={install}
      >
        <Download aria-hidden="true" />
        {installing ? "Installing…" : "Install Gym Ladder"}
      </Button>
      {instructions && (
        <p role="status" className="text-sm leading-6 text-muted-foreground">
          {instructions}
        </p>
      )}
    </div>
  );
}
