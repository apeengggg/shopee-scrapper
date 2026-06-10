# Agents Console

Authenticated local SaaS-style console for managing configured agents and published landing-page previews.

## Setup

```powershell
npm.cmd install
Copy-Item .env.example .env
docker compose up -d postgres
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run seed:admin
npm.cmd run dev -- -p 3003
```

Default URL: `http://localhost:3003`

Default local admin:

- Email: `admin@example.com`
- Password: `ChangeMe123!`

Change these values in `.env` before seeding if needed.

## Behavior

- Reads agent definitions from `../agents.config.json`.
- Monitors agent health endpoints.
- Reads landing-page drafts through the Landing Page Agent API.
- Publishes and unpublishes landing-page previews through the Landing Page Agent API.
- Does not start or stop agents directly; use the root runner.
