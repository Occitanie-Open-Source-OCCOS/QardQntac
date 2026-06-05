# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
just up          # Start Docker (PostgreSQL) + dev server
just down        # Stop Docker services
pnpm dev         # Dev server only (requires Docker already running)
pnpm build       # Production build
pnpm lint        # Lint with Biome
pnpm format      # Format with Biome
pnpm check       # Lint + format (write mode)
pnpm email:dev   # Preview emails with React Email

# Database
pnpm db:generate  # Generate Drizzle migration files from schema changes
pnpm db:migrate   # Apply pending migrations

# Better Auth schema sync (run when auth config changes)
pnpm ba:generate  # Generate Better Auth schema to db/schemas/auth.ts
pnpm ba:migrate   # Apply Better Auth migrations
```

## Architecture

### Route Groups (`app/`)

Next.js App Router with four route groups:
- `(guest)` — Public pages: landing (homepage at `/`), legal pages, OG image generation, email unsubscribe
- `(auth)` — Auth portal at `/portal` (magic link sign-in)
- `(app)` — Protected dashboard at `/app`
- `(api)` — API routes, including the Better Auth handler at `/api/auth/[...all]`

### Feature Structure (`src/features/`)

Business logic is organized into features:
- `auth` — Magic link sign-in, session, email templates
- `emails` — Shared email layout and translations
- `common` — Shared UI utilities
- `app/contacts` — Contact CRUD (list, save, delete, vCard sync)
- `app/scanner` — Business card scan wizard: capture → AI analysis → review/save
  - `scanner/detection/` — Pure canvas heuristics (card-formats, card-detection, hooks)
  - `scanner/components/steps/` — CaptureStep, ProcessingStep, ReviewStep
- `app/providers` — LLM/OCR provider configuration (stored per-user)
- `app/tags` — Tag management and filtering
- `app/layouts` — AppHeader, AppTabs, page shell

Each feature contains some combination of: `components/`, `actions/`, `translations/`, `hooks/`, `schemas/`.

### Core Libraries (`src/lib/`)

- `db.ts` — Drizzle ORM client (PostgreSQL via `pg` Pool)
- `actions.ts` — Three `next-safe-action` clients:
  - `action` — public (no auth)
  - `authentificatedAction` — requires `role === "user"` (injects `ctx.userId`, `ctx.user`)
  - `anyAuthenticatedAction` — any authenticated session regardless of role
- `auth/server.ts` — Better Auth server instance
- `i18n.ts` — next-intl request config; merges all `src/features/*/translations/` dirs

### Configuration (`config/`)

All app-wide config lives here (not in `src/`):
- `auth/` — Better Auth config and access-control
- `project.ts` — App name and metadata
- `database.ts`, `url.ts`, `i18n.ts`, `restrictions.ts`, `security.ts`

### Database (`db/`)

- `schemas/` — Drizzle table definitions (`auth.ts`, `membership.ts`) + `index.ts` barrel
- `migrations/` — Auto-generated SQL migration files

## Key Patterns

### Authentication

Better Auth with **magic links only** (no email/password). Registration restricted to whitelisted email domains defined in `config/restrictions.ts`. The first user created automatically becomes `admin`; subsequent users get `user` role.

Better Auth uses the `organization` plugin — organizations are mapped to `membership_profiles` in the DB schema. Sessions automatically set `activeOrganizationId` to the user's most recent membership.

### Server Actions

Always pick the right client from `src/lib/actions.ts`:
- `action` — unauthenticated
- `authentificatedAction` — member-only (role must be `"user"`)
- `anyAuthenticatedAction` — any logged-in user (admin or user)

### i18n

Supported locales: `fr`, `en`. Locale prefix is `never` (no `/fr/` in URLs). Default locale set via `APP_LOCALE` env var. Translation namespace `"feature.section"` maps to `src/features/[feature]/translations/[locale].json` → `section` key.

### Code Style

Biome for lint and format. **Tabs** for indentation, 120-character line width, double quotes. JSON formatting disabled (manual). Run `pnpm check` before committing.

## Environment Variables

Required (see `env.ts` for full schema):
- `APP_URL`, `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- `APP_LOCALE` — `fr` or `en` (defaults to `fr`)

Optional: `AUTORIZED_DOMAINS` (comma-separated additional trusted origins), `UMAMI_ANALYTICS_ID`, `CAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`, `NEXT_PUBLIC_CAPTCHA_SERVER_URL`, `GOOGLE_TAG_MANAGER_ID`
