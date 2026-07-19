# Escalera – Arbeitsanweisungen für Agents

Diese Datei gilt für alle KI-Agents (Claude Code, Codex u. a.). Die ausführliche
Arbeitsweise steht in [`AGENTS.md`](AGENTS.md) und
[`Documentation/Development-Workflow.md`](Documentation/Development-Workflow.md).

## Branch-Modell (verbindlich)

- **`development`** ist der Standard- und Integrationsbranch. Alle Ticket-/Feature-Branches
  (`ticket/<Nummer>-<name>`) gehen **von `development` aus** und werden per Pull Request
  **nach `development`** gemergt.
- **`main`** ist ausschließlich der Release-/Produktionsbranch.
  **Jeder Merge nach `main` löst automatisch ein Live-Produktions-Deployment aus**
  (`.github/workflows/production-deploy.yml`, Ziel `https://play.169-58-40-56.sslip.io`).
- **Niemals direkt nach `main` pushen oder mergen.** Nach `main` gelangt Code nur über einen
  bewussten Release-PR `development` → `main`, und nur nach ausdrücklicher Nutzerfreigabe.
- Ein Release nach `main` erfolgt erst, wenn auf `development` genug geprüfte Änderungen
  gesammelt sind.

```text
ticket/<Nummer>  ──PR──▶  development  ──Release-PR──▶  main  ──▶  Auto-Deploy
```

## Freigaben

Commit, Push, Merge und Branch-Löschung erfolgen nur nach ausdrücklicher Freigabe des
Nutzers. Ein Merge nach `main` (Release) ist immer ein eigener, separat freizugebender
Schritt, weil er sofort live deployt.
