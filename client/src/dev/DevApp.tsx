import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import type { User } from "../lib/types.js";
import { isDevAuthorized, parseDevRoute, type DevRoute } from "./access.js";
import { findPreview, previews } from "./registry.js";
import "./dev.css";

// The admin-only component gallery (#89). It verifies the session is an admin
// account and otherwise redirects to the main screen; the previews render the
// real production components, so any change to a component shows up here.
export function DevApp() {
  const [status, setStatus] = useState<"loading" | "ok">("loading");
  const [route, setRoute] = useState<DevRoute>(() => parseDevRoute(window.location.pathname, window.location.hash));

  useEffect(() => {
    let active = true;
    api<{ user: User }>("/auth/me")
      .then((result) => {
        if (!active) return;
        if (isDevAuthorized(result.user)) setStatus("ok");
        else window.location.replace("/");
      })
      .catch(() => { if (active) window.location.replace("/"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onChange = () => setRoute(parseDevRoute(window.location.pathname, window.location.hash));
    window.addEventListener("hashchange", onChange);
    window.addEventListener("popstate", onChange);
    return () => { window.removeEventListener("hashchange", onChange); window.removeEventListener("popstate", onChange); };
  }, []);

  if (status !== "ok") return <div className="dev-gate"><p className="brand">Escalera</p><p className="muted">Zugriff wird geprüft …</p></div>;

  const active = route.kind === "component" ? findPreview(route.id) : undefined;
  const groups = [...new Set(previews.map((preview) => preview.group))];

  return <div className="dev-shell">
    <aside className="dev-sidebar">
      <a className="dev-home" href="#/dev">◧ Komponenten</a>
      {groups.map((group) => <div className="dev-group" key={group}>
        <h3>{group}</h3>
        {previews.filter((preview) => preview.group === group).map((preview) => <a key={preview.id} className={`dev-link ${active?.id === preview.id ? "is-active" : ""}`} href={`#/dev/${preview.id}`}>{preview.title}</a>)}
      </div>)}
    </aside>
    <main className="dev-main">
      {active
        ? active.full
          ? <><a className="dev-escape" href="#/dev">← Galerie</a><div className="dev-full">{active.render()}</div></>
          : <div className="dev-canvas"><header className="dev-canvas-head"><h2>{active.title}</h2><span className="muted">{active.group}</span></header><div className="dev-preview">{active.render()}</div></div>
        : <div className="dev-gallery"><h1>Komponenten-Galerie</h1><p className="muted">{previews.length} Vorschauen · nur für Admin-Konten sichtbar</p><div className="dev-tiles">{previews.map((preview) => <a key={preview.id} className="dev-tile" href={`#/dev/${preview.id}`}><strong>{preview.title}</strong><span className="muted">{preview.group}</span></a>)}</div></div>}
    </main>
  </div>;
}
