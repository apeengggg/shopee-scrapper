# OpenAI/Codex Landing Page Generation

## Overview

Landing Pages can generate bilingual landing-page drafts from imported leads using an OpenAI API model. When project notes mention Codex generation, they mean this runtime OpenAI API model flow. The deterministic template generator remains as a fallback.

Landing Pages owns generated draft storage, regeneration, publishing state, preview routes, and customer-facing pages at `/p/[slug]`.
Agents Console can run the full lead-to-landing pipeline from one screen: search Lead Maps, import selected leads into Landing Pages, generate drafts, and leave them ready for review by default.

## API Key

Preferred setup:

1. Sign in to Agents Console.
2. Open OpenAI settings.
3. Save the OpenAI API key.
4. Console stores the key encrypted and sends it server-to-server only when requesting generation through Landing Pages APIs.
5. Browser clients never receive the raw API key after saving.

Fallback setup:

```env
OPENAI_API_KEY="..."
OPENAI_MODEL="gpt-5.5"
```

in `agents/agents-landing-pages/.env`.

## Credential Encryption

Console uses `CREDENTIAL_ENCRYPTION_KEY` for AES-256-GCM encryption. It must be 32 bytes encoded as base64.

Generate one with PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## Generation Contract

The model must return structured JSON with:

- Indonesian and English descriptions.
- Hero headline and subheadline.
- Service bullets.
- Trust points.
- CTA text.
- Contact section.
- Suggested template photo key.

Console must request generation through Landing Pages APIs. Console must not read or write the Landing Pages database directly.
For automated pipeline runs, Console sends selected imported lead IDs to Landing Pages and stores pipeline run summaries in the Console database.

## Safety Rules

- Do not invent factual business details.
- Do not invent phone numbers, addresses, testimonials, pricing, opening hours, ratings, licenses, awards, or real photos.
- Use available lead fields only.
- If details are missing, use neutral copy that asks the customer to contact the business directly.
- Use local template photos only.
- Customer preview pages must stay public after publishing and must not require Console authentication.
- Do not use generated, remote, or claimed real business photos unless the user explicitly asks for that change.

## Fallback

If OpenAI generation fails or no key is available, Landing Pages saves a deterministic template draft and records the fallback metadata.
