import { useEffect, useState } from "react";

interface DeferredInstallPrompt extends Event {
  prompt: () => Promise<void>;
}

function runsAsInstalledApp() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || navigatorWithStandalone.standalone === true;
}

function usesAppleMobileDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function App() {
  const [installed, setInstalled] = useState(runsAsInstalledApp);
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredInstallPrompt);
    };
    const onAppInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const requestInstall = async () => {
    await installPrompt?.prompt();
    setInstallPrompt(null);
  };

  return (
    <main className="app-shell">
      <section>
        <p className="eyebrow">Escalera</p>
        <h1>{installed ? "Escalera ist bereit" : "Escalera installieren"}</h1>
        {installed ? (
          <p>Die App läuft ohne Browser-Navigationsleiste. Anmeldung und Lobby folgen als nächste Spielschritte.</p>
        ) : (
          <>
            <p>Füge Escalera zum Home-Bildschirm hinzu, damit das Spiel als eigene Vollbild-App startet.</p>
            {installPrompt ? <button onClick={requestInstall}>App installieren</button> : null}
            <ol className="install-help">
              {usesAppleMobileDevice() ? (
                <li>In Safari auf Teilen tippen und „Zum Home-Bildschirm“ wählen.</li>
              ) : (
                <li>Im Browsermenü „Installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.</li>
              )}
              <li>Escalera anschließend über das neue App-Symbol starten.</li>
            </ol>
          </>
        )}
      </section>
    </main>
  );
}
