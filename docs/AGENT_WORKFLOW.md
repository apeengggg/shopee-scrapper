# Agent And Feature Workflow For Codex

Use this guide before changing an existing feature, changing an agent, or creating a new agent. It is the quick path so future Codex sessions do not need to reread the whole repository.

## Before Changing Features Or Agents

1. Read `AGENTS.md`, `docs/AGENT_CONTEXT.md`, and the latest file in `docs/codex-log/`.
2. Identify the owning app:
   - Lead discovery belongs to `agents/agents-lead-maps`.
   - Landing-page generation, drafts, publishing, public previews, and template photos belong to `agents/agents-landing-pages`.
   - Users, sessions, encrypted OpenAI credentials, and management UI belong to `agents/agents-console`.
3. Create a new per-prompt continuity log in `docs/codex-log/` before or during the change.

## Changing Existing Features

- Keep ownership boundaries. Console calls Landing Pages through APIs; it must not read the Landing Pages database directly.
- Console may orchestrate multi-agent workflows, including lead-to-landing automation, but the worker agents still own their data and behavior.
- Keep Landing Pages public preview routes unauthenticated for customers.
- Store OpenAI API keys only in `.env` or encrypted Console database records, and never return raw keys to browser clients.
- Treat "Codex generation" in this project as OpenAI API model generation using the key registered in Console, not direct customer-page file edits by the Codex coding agent.
- Use structured JSON generation and validation before saving generated landing-page content.
- Use deterministic template generation as fallback when OpenAI is unavailable.
- Use local template photos for landing pages unless the user explicitly asks for generated or remote images.
- After completing the implemented plan and required verification, commit the finished work unless the user explicitly says not to commit.
- Group commits by feature and subsystem; keep unrelated feature work in separate commits.
- For automated pipelines, store run history and user-configurable defaults in Console, then call Lead Maps and Landing Pages APIs.

## Changing Existing Agents

- Keep each app inside its ownership boundary and prefer API contracts between agents.
- Update the affected agent README when runtime, environment, or verification steps change.
- Update `docs/AGENT_CONTEXT.md` when ports, databases, data flow, ownership, or startup behavior changes.
- Add or update focused tests when changing shared behavior, API contracts, generation, auth, or publishing.

## Creating A New Agent

1. Add the app under `agents/<agent-folder>`.
2. Add `package.json`, `.env.example`, `README.md`, and `/api/health`.
3. Add `docker-compose.yml` if the agent needs a database.
4. Choose unique app and database ports. Update `agents/agents.config.json`.
5. Add startup and verification instructions to the new agent README.
6. Update `agents/README.md` and `docs/AGENT_CONTEXT.md`.
7. Add tests or validation commands appropriate for the stack.

## Required Verification

- Landing Pages and Console changes:
  - `npm.cmd run test`
  - `npm.cmd run lint`
  - `npm.cmd run build`
- Lead Maps changes:
  - `npm.cmd run lint`
  - `npx.cmd tsc --noEmit --incremental false`

Document any command that cannot be run or any known local limitation in the per-prompt continuity log.

## Commit Rules

- Commit only after the implemented plan is complete and verification has been run or documented.
- Group commits by feature and subsystem, not by prompt if one prompt touches unrelated areas.
- Use focused commit messages that name the affected feature or subsystem.
- Do not include `.env`, API keys, generated logs, `.next`, `node_modules`, coverage, or `*.tsbuildinfo`.
