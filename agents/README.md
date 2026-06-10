# Agents Documentation

This folder contains two local agents that work together:

- `agents-lead-maps`: finds local business leads from OpenStreetMap/Overpass.
- `agents-landing-pages`: imports those leads and generates bilingual landing-page drafts.
- `agents-console`: authenticated console for monitoring agents and managing published landing-page previews.

## App Map

| Agent | Folder | Default URL | Database | Purpose |
| --- | --- | --- | --- | --- |
| Lead Maps Agent | `agents-lead-maps` | `http://localhost:3001` | `127.0.0.1:15432/lead_maps_agent` | Search businesses, classify leads, export lead data |
| Landing Page Agent | `agents-landing-pages` | `http://localhost:3002` | `127.0.0.1:5433/landing_pages_agent` | Import leads, create descriptions, edit landing-page drafts |
| Agents Console | `agents-console` | `http://localhost:3003` | `127.0.0.1:5434/agents_console` | Monitor agents, publish previews, manage landing pages |

## Data Flow

1. Start `agents-lead-maps`.
2. Run searches or campaigns to collect business leads.
3. Start `agents-landing-pages`.
4. Import leads from `http://localhost:3001/api/leads`.
5. Generate and edit bilingual landing-page drafts.
6. Publish successful drafts from the console to create preview URLs like `http://localhost:3002/p/example-business`.
7. Register an OpenAI API key in the Console to generate richer landing-page drafts; local template generation remains the fallback.

The Landing Page Agent stores imported copies in its own database and does not modify the Lead Maps database.

## Configuration

Each app has its own `.env` file.

Lead Maps Agent:

```powershell
cd D:\my\agents\agents-lead-maps
Copy-Item .env.example .env
```

Required defaults:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:15432/lead_maps_agent?schema=public"
APP_USER_AGENT="LeadMapsAgent/0.1 (admin@example.com)"
OVERPASS_ENDPOINT="https://overpass-api.de/api/interpreter"
NOMINATIM_ENDPOINT="https://nominatim.openstreetmap.org/search"
```

Landing Page Agent:

```powershell
cd D:\my\agents\agents-landing-pages
Copy-Item .env.example .env
```

Required defaults:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/landing_pages_agent?schema=public"
LEAD_MAPS_API_BASE="http://localhost:3001"
```

Agents Console:

```powershell
cd D:\my\agents\agents-console
Copy-Item .env.example .env
```

Required defaults:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/agents_console?schema=public"
CONSOLE_PUBLIC_URL="http://localhost:3003"
LANDING_PAGES_API_BASE="http://localhost:3002"
LANDING_PAGES_PUBLIC_URL="http://localhost:3002"
AGENTS_CONFIG_PATH="../agents.config.json"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="ChangeMe123!"
SESSION_SECRET="change-this-local-secret"
CREDENTIAL_ENCRYPTION_KEY=""
```

## Database Setup

Start each PostgreSQL container from its app folder:

```powershell
cd D:\my\agents\agents-lead-maps
docker compose up -d postgres
npm.cmd run prisma:generate
npm.cmd run prisma:migrate

cd D:\my\agents\agents-landing-pages
docker compose up -d postgres
npm.cmd run prisma:generate
npm.cmd run prisma:migrate

cd D:\my\agents\agents-console
docker compose up -d postgres
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run seed:admin
```

If Docker Desktop is not running, start it first and rerun the commands.

## Start Apps

Recommended helper:

```powershell
cd D:\my\agents
powershell.exe -ExecutionPolicy Bypass -File .\start-agents.ps1
```

Manual commands:

```powershell
cd D:\my\agents\agents-lead-maps
npm.cmd run dev -- -p 3001

cd D:\my\agents\agents-landing-pages
npm.cmd run dev -- -p 3002

cd D:\my\agents\agents-console
npm.cmd run dev -- -p 3003
```

Open:

- Lead Maps Agent: `http://localhost:3001`
- Landing Page Agent: `http://localhost:3002`
- Agents Console: `http://localhost:3003`

## Agent Details

### Lead Maps Agent

Use this app first. It searches OpenStreetMap data by location and business category, then classifies businesses:

- `ready`: no website and has a phone number.
- `candidate`: no website and no phone number yet.
- `ignored`: already has a website.

Useful commands:

```powershell
npm.cmd run dev
npm.cmd run test
npm.cmd run lint
npm.cmd run build
npm.cmd run worker
```

### Landing Page Agent

Use this app after Lead Maps has collected leads. It imports leads through the Lead Maps API and generates editable bilingual copy:

- business description in Indonesian and English,
- hero headline and subheadline,
- service bullets,
- trust points,
- CTA,
- contact section,
- preview page.

Useful commands:

```powershell
npm.cmd run dev -- -p 3002
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

The generator is deterministic and does not require an AI API key. It does not invent phone numbers, addresses, testimonials, pricing, or opening hours.

### Agents Console

Use this app to monitor configured agents and manage landing-page publishing:

- agent health cards from `agents.config.json`,
- authenticated login,
- landing-page list from the Landing Page Agent API,
- publish/unpublish controls,
- encrypted OpenAI API key settings,
- OpenAI-backed regeneration controls,
- preview links and embedded previews.

Useful commands:

```powershell
npm.cmd run dev -- -p 3003
npm.cmd run seed:admin
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```
