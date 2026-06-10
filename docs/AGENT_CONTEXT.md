# Agent Workspace Context

This document lets future Codex sessions understand the workspace without rereading every file. For change-by-change handoff notes, read the latest file in `docs/codex-log/`.

## Architecture

The workspace contains three local apps:

- Lead Maps Agent (`agents/agents-lead-maps`): finds businesses from OpenStreetMap/Overpass and stores leads.
- Landing Page Agent (`agents/agents-landing-pages`): imports leads, generates landing-page drafts, and serves customer preview pages.
- Agents Console (`agents/agents-console`): authenticated management console for users, agent health, OpenAI credential settings, and landing-page publishing.

## Data Flow

1. Lead Maps searches businesses and stores lead records.
2. Console can orchestrate a lead-to-landing pipeline from one UI: search Lead Maps, select leads, import into Landing Pages, generate drafts, and leave them ready for review.
3. Landing Pages imports leads from Lead Maps API and owns generated draft records.
4. Landing Pages generates or regenerates landing-page drafts with the Console-registered OpenAI key sent server-to-server.
5. Console stores encrypted OpenAI credentials and lists, previews, publishes, or unpublishes drafts through Landing Pages APIs.
6. Customers view published pages at Landing Pages public routes like `/p/[slug]`.

## Runtime

Use:

```powershell
cd D:\my\agents
powershell.exe -ExecutionPolicy Bypass -File .\start-agents.ps1
```

Configuration is in `agents/agents.config.json`.

## Ownership

- Lead discovery belongs in Lead Maps.
- Draft generation, preview rendering, slugs, and template photos belong in Landing Pages.
- Users, sessions, encrypted credentials, and management screens belong in Console.
- Shared behavior should be exposed through APIs first, not direct cross-app database access.
- Runtime landing-page generation uses the OpenAI API key registered in Console. When docs mention Codex generation, treat it as this OpenAI API model flow, not direct file edits by the Codex coding agent.
- Customer preview routes remain public after publishing.
- Landing page photos must use local template photos unless the user explicitly asks for generated or remote images.
- Console owns pipeline orchestration and configurable defaults, but must call Lead Maps and Landing Pages through APIs.

## Adding A New Agent

Follow `docs/AGENT_WORKFLOW.md` for changing features or creating agents. The short version:

1. Create or update `agents/<agent-folder>`.
2. Add `.env.example`, `README.md`, `package.json`, `/api/health`, and Docker config if a database is needed.
3. Register ports and commands in `agents/agents.config.json`.
4. Update `agents/README.md`, this file, and relevant per-prompt logs.
5. Add or run the validation commands listed in `AGENTS.md`.

## Known Local Notes

- Lead Maps uses database host port `15432` because local `5432` was unreliable/conflicting.
- Console default port is `3003`.
- OpenAI secrets must not be committed.
- Codex sessions should create a new per-prompt log in `docs/codex-log/`, not append to a single shared changelog.
- Lead-to-landing automation stores run history in Console and defaults to review before publish.
