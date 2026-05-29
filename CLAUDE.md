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
- `(app)` — Protected dashboard at `/app/admin` (admin users) and `/app/member` (regular users)
- `(api)` — API routes, including the Better Auth handler at `/api/auth/[...all]`

### Feature Structure (`src/features/`)

Business logic is organized into features. Each feature typically contains:
- `components/` — React components
- `hooks/` — Client-side hooks
- `schemas/` — Zod validation schemas
- `translations/` — i18n JSON files (`fr.json`, `en.json`)
- `actions/` — Next Safe Action server actions
- `emails/` — React Email templates and senders
- `layouts/` — Layout components scoped to the feature

Current features: `auth`, `landing`, `app` (with sub-features `organizations`, `membership`, `membership-application`), `common`, `contact`, `cookie`, `emails`, `legal`, `seo`, `analytic`

### Core Libraries (`src/lib/`)

- `db.ts` — Drizzle ORM client (PostgreSQL via `pg` Pool)
- `actions.ts` — Three `next-safe-action` clients: `action` (public), `authentificatedAction` (requires `role === "user"`), `adminAction` (requires `role === "admin"`)
- `auth/server.ts` — Better Auth server instance
- `i18n.ts` — next-intl request config; loads translations by merging all feature translation dirs

### Configuration (`config/`)

All app-wide configuration lives here (not in `src/`):
- `auth/` — Better Auth config (server + access-control)
- `database.ts`, `url.ts`, `project.ts`, `i18n.ts`, `restrictions.ts`, `security.ts`

### Database (`db/`)

- `schemas/` — Drizzle table definitions (`auth.ts`, `membership.ts`) + `index.ts` barrel export
- `migrations/` — Auto-generated SQL migration files

## Key Patterns

### Authentication

Better Auth with **magic links only** (no email/password). Registration is restricted to whitelisted email domains (`occos-cluster.com`, `occos-cluster.fr`, `occos.fr`) defined in `config/restrictions.ts`. The first user created automatically becomes `admin`; subsequent users get `user` role.

Better Auth uses the `organization` plugin — organizations are mapped to `membership_profiles` in the DB schema. Sessions automatically set `activeOrganizationId` to the user's most recent membership.

### Server Actions

Always use the appropriate action client from `src/lib/actions.ts`:
- `action` for unauthenticated operations
- `authentificatedAction` for member-only operations (injects `ctx.userId` and `ctx.user`)
- `adminAction` for admin-only operations

### i18n

Supported locales: `fr`, `en`. Locale prefix is `never` (URLs don't include `/fr/` or `/en/`). The default locale is set via the `APP_LOCALE` env var. Translation files live at `src/features/[feature]/translations/[locale].json` and are loaded in `src/lib/i18n.ts`.

### Code Style

Biome handles linting and formatting. JS/TS uses **tabs** for indentation, 120-character line width, double quotes. JSON formatting is disabled (manual). Run `pnpm check` before committing.

## Environment Variables

Required variables (see `env.ts` for full schema with validation):
- `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- `APP_LOCALE` — `fr` or `en` (defaults to `fr`)

Optional: `AUTORIZED_DOMAINS` (comma-separated additional trusted origins), `UMAMI_ANALYTICS_ID`, `CAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY`, `NEXT_PUBLIC_CAPTCHA_SERVER_URL`, `GOOGLE_TAG_MANAGER_ID`
