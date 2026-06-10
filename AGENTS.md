# Project Rules For Codex

## Workspace Map

- `agents/agents-lead-maps`: searches OpenStreetMap/Overpass for business leads.
- `agents/agents-landing-pages`: imports leads, generates landing-page drafts, publishes customer previews.
- `agents/agents-console`: authenticated console for agent health, OpenAI credential settings, and landing-page management.
- `agents/agents.config.json`: source of truth for local agent runner configuration.
- `agents/start-agents.ps1`: starts enabled agents from `agents.config.json`.

## Local Ports And Databases

- Lead Maps: `http://localhost:3001`, database `127.0.0.1:15432/lead_maps_agent`.
- Landing Pages: `http://localhost:3002`, database `127.0.0.1:5433/landing_pages_agent`.
- Console: `http://localhost:3003`, database `127.0.0.1:5434/agents_console`.

## Development Rules

- Do not commit `.env`, API keys, generated logs, `.next`, `node_modules`, coverage, or `*.tsbuildinfo`.
- Prefer existing Next.js, Prisma, Zod, Tailwind, and local helper patterns.
- Create a new continuity log file for every user prompt in `docs/codex-log/` using `YYYY-MM-DD-HHMM-short-topic.md` in Asia/Jakarta time. Include prompt summary, plan/status, files touched or expected, blockers, verification, and next step so future Codex sessions can continue after interruption or context limits.
- After finishing an implemented plan and required verification, commit the completed work unless the user explicitly says not to commit.
- Group commits by feature and subsystem. Prefer separate commits for distinct features or areas such as `agents-console`, `agents-landing-pages`, `agents-lead-maps`, and `docs`; do not mix unrelated feature work in one commit.
- Keep app ownership boundaries:
  - Lead Maps owns lead discovery.
  - Landing Pages owns generated drafts and public preview routes.
  - Console owns users, sessions, encrypted credentials, and management UI.
- Console must call Landing Pages through APIs; do not add direct Console reads of the Landing Pages database.
- Landing Pages public preview routes must not require Console auth.
- Use local template photos for landing pages unless the user explicitly asks for generated or remote images.

## OpenAI And Codex Generation Rules

- Store OpenAI API keys only in `.env` or encrypted Console database records.
- Never return raw API keys to browser clients after saving.
- Runtime landing-page generation uses the OpenAI API key registered in Console, sent server-to-server through Landing Pages APIs. In project docs, "Codex generation" means this OpenAI API model flow, not direct file edits by the Codex coding agent.
- Landing Pages owns generation, regeneration, draft storage, publishing state, preview routes, and customer-facing `/p/[slug]` pages.
- Prefer structured JSON generation and validate output before saving it.
- Keep deterministic template generation as fallback when OpenAI is unavailable.
- Do not invent phone numbers, addresses, testimonials, pricing, opening hours, ratings, licenses, awards, or real photos.
- Generated copy should be bilingual Indonesian and English unless explicitly changed.
- Landing-page images must come from local template photos unless the user explicitly requests generated or remote images.

## Verification

- For Landing Pages and Console changes, run:
  - `npm.cmd run test`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- For Lead Maps changes, run:
  - `npm.cmd run lint`
  - `npx.cmd tsc --noEmit --incremental false`
- The Lead Maps full Next build may hang locally before compilation; document this if it still occurs.

## Adding Or Changing Agents

- Add the app under `agents/<agent-folder>`.
- Add or update that agent in `agents/agents.config.json`.
- Give it a unique port and database port.
- Add `.env.example`, `README.md`, `docker-compose.yml` if it needs a database, and `/api/health`.
- Update `agents/README.md` and `docs/AGENT_CONTEXT.md`.
- Follow `docs/AGENT_WORKFLOW.md` so future Codex sessions can change agents, add features, or create agents without rereading the whole repository.
