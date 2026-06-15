<p align="center">
  <img src=".github/assets/logo.png" alt="QardQntac" width="200" />
</p>

# QardQntac

**QardQntac** is an open-source, self-hosted business card scanner. Take a photo of a business card, let AI extract the contact information, then save it to your address book — or sync it directly to any CardDAV server (Nextcloud, Radicale, Baikal, …).

---

## What it does

1. **Scan** — take a photo with your phone camera or upload an image from your gallery
2. **Extract** — AI reads the card and fills in the contact fields (name, company, phone, email, website, address)
3. **Review** — correct any mistakes before saving
4. **Tag** — organize contacts with color-coded tags
5. **Export or sync** — download a `.vcf` file or push the contact to a CardDAV server

Everything runs on your own server. No data leaves your infrastructure unless you choose a cloud AI provider.

---

## Features

- **AI-powered extraction** — works with a local model via [Ollama](https://ollama.com) (no internet required) or cloud providers (OpenAI, Anthropic, Google Gemini)
- **CardDAV sync** — one-click sync to Nextcloud, Radicale, Baikal, or any standard CardDAV server; tags are exported as `CATEGORIES` in the vCard
- **Tags** — create color-coded tags, filter your contact list, assign multiple tags per contact
- **vCard export** — download any contact as a standard `.vcf` file
- **Duplicate detection** — prevents saving contacts that already exist (matched by name, email, or phone)
- **Magic link login** — no passwords; sign in via a link sent to your email
- **Access control** — restrict sign-ups to specific email domains, or disable registration entirely
- **Multi-language** — English and French interface, configurable via environment variable
- **Self-hosted** — runs on any Linux server with Docker and Node.js

---

## Requirements

Before installing, make sure you have:

- **A Linux server**
- **Docker**
- **Node.js 20+** and **pnpm**
- **An SMTP server** *(optional)* — to send magic link login emails. Without one, links are printed in the server console instead
- **An AI provider** — either Ollama running locally, or an API key from OpenAI / Anthropic / Google

---

## Quick start with Docker Compose

The fastest way to run QardQntac locally with a local AI model — no Node.js or pnpm required.

```yaml
services:
  app:
    image: occos/qardqntac:latest
    restart: unless-stopped
    ports:
      - "3000:80"
    environment:
      APP_URL: http://localhost:3000
      APP_SECRET: changeme   # replace with: openssl rand -base64 32
      DATABASE_URL: postgres://user:password@db:5432/db   # optional — omit to use the embedded database
      OLLAMA_BASE_URL: http://ollama:11434
      OLLAMA_MODEL: llama3.2-vision
    volumes:
      - app_data:/app/data   # embedded fallback database (only used if DATABASE_URL is not set)
    depends_on:
      db:
        condition: service_healthy

  # optional — only needed if you want to use a local PostgreSQL database instead of the embedded one
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d db"]
      interval: 5s
      timeout: 5s
      retries: 5

  ollama:
    image: ollama/ollama
    volumes:
      - ollama_data:/root/.ollama
    entrypoint: >
      /bin/sh -c "
      ollama serve &
      until ollama list 2>/dev/null; do sleep 1; done &&
      ollama pull $${OLLAMA_MODEL:-llama3.2-vision} &&
      wait
      "
    # Uncomment to use a GPU:
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]

volumes:
  postgres_data:
  ollama_data:
  app_data:
```

### 2. Start the stack

```bash
docker compose up -d
```

The Ollama container automatically pulls the configured model on first start. First boot takes a few minutes while the model downloads.

> For lower-spec machines, set `OLLAMA_MODEL=moondream` in the `app` service environment — the pull will use that value automatically.

### 3. Open the app

Go to [http://localhost:3000](http://localhost:3000). The first account created becomes the administrator.

---

## Run the app container only

If you already have PostgreSQL and Ollama running elsewhere:

```bash
docker run -d \
  --name qardqntac \
  -p 3000:80 \
  -v qardqntac_data:/app/data \
  -e APP_URL=http://localhost:3000 \
  occos/qardqntac:latest
```

> On Linux, add `--add-host=host.docker.internal:host-gateway` to resolve the host machine from inside the container.

---

## Installation (from source)

### 1. Clone the repository

```bash
git clone <repo-url>
cd qardqntac
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values (see [Configuration](#configuration) below).

### 4. Start the database

```bash
just up
```

This starts PostgreSQL via Docker and launches the development server.

### 5. Apply database migrations

```bash
pnpm db:migrate
```

### 6. Open the app

Go to [http://localhost:3000](http://localhost:3000) and sign in with your email. The first account created automatically becomes the administrator.

---

## Configuration

All configuration is done through environment variables in your `.env` file.

### Required

| Variable | Description |
|---|---|
| `APP_URL` | The URL where your app is accessible (e.g. `https://cards.example.com`) |
| `APP_SECRET` | Random secret key — generate with `openssl rand -base64 32` |

### SMTP (optional)

QardQntac uses magic links to sign in. If SMTP is configured, the link is sent by email. **If not, the link is printed in the server logs** — useful for testing or self-hosted setups where you have direct console access.

| Variable | Description |
|---|---|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (usually `587` or `465`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM` | Sender address (e.g. `QardQntac <no-reply@example.com>`) |

### AI provider

| Variable | Description | Default |
|---|---|---|
| `VISION_PROVIDER` | Which AI to use: `ollama`, `openai`, `anthropic`, or `gemini` | `ollama` |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Vision model name | `llama3.2-vision` |
| `OPENAI_API_KEY` | Required if `VISION_PROVIDER=openai` | — |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o` |
| `ANTHROPIC_API_KEY` | Required if `VISION_PROVIDER=anthropic` | — |
| `ANTHROPIC_MODEL` | Anthropic model to use | `claude-3-5-sonnet-20241022` |
| `GEMINI_API_KEY` | Required if `VISION_PROVIDER=gemini` | — |
| `GEMINI_MODEL` | Gemini model to use | `gemini-1.5-flash` |

### Optional

| Variable | Description | Default |
|---|---|---|
| `LOCALE` | Interface language: `en` or `fr` | `en` |
| `AUTH_WHITELISTED_DOMAINS` | Comma-separated list of allowed email domains (e.g. `company.com,partner.org`). Leave empty to allow any domain. | *(all allowed)* |
| `AUTH_ALLOW_REGISTRATION` | Set to `false` to prevent new accounts from being created | `true` |
| `AUTORIZED_DOMAINS` | Additional trusted origins for CORS (comma-separated URLs) | — |
| `DATABASE_URL` | PostgreSQL connection string. If omitted, falls back to an embedded database stored in `./data/local.db` — not suitable for production |
| `DISABLE_DB_WARN` | Set to `true` to suppress the startup warning when `DATABASE_URL` is not set |


---

## HTTPS and mobile access

**The camera scanner requires HTTPS.** Browsers block access to the device camera on plain `http://` pages (except `localhost`). To use QardQntac on a phone or tablet, the app must be served over HTTPS with a valid certificate.

### Using Traefik (recommended)

[Traefik](https://traefik.io) is a reverse proxy that automatically provisions Let's Encrypt certificates. A minimal setup with Docker Compose:

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3
    command:
      - --providers.docker=true
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.le.acme.tlschallenge=true
      - --certificatesresolvers.le.acme.email=you@example.com
      - --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - letsencrypt:/letsencrypt

  qardqntac:
    image: qardqntac
    labels:
      - traefik.http.routers.qardqntac.rule=Host(`cards.example.com`)
      - traefik.http.routers.qardqntac.tls.certresolver=le
```

> For local development on desktop, `http://localhost:3000` works fine. The camera restriction only applies to real devices accessed over a network.

---

## Setting up an AI provider

### Ollama

Ollama runs AI models directly on your server. No API key needed, fully private.

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download a vision model
ollama pull llama3.2-vision

# Make sure it's running
ollama serve
```

Set in `.env`:
```
VISION_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2-vision
```

> `llama3.2-vision` requires ~5 GB of GPU/RAM. For lower-spec machines, try `moondream` (~1.7 GB) or `minicpm-v`.

### OpenAI

```
VISION_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

### Anthropic

```
VISION_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### Google Gemini

```
VISION_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
```

---

## Syncing to a CardDAV server

CardDAV is the standard protocol used by contact apps (iOS Contacts, Android, Nextcloud, Thunderbird, etc.). QardQntac can push contacts directly to any CardDAV address book.

### Supported servers

| Server | URL format |
|---|---|
| **Nextcloud** | `https://nextcloud.example.com/remote.php/dav/addressbooks/users/USERNAME/contacts/` |
| **Radicale** | `http://host:5232/USERNAME/contacts/` |
| **Baikal** | `http://host/baikal/dav.php/addressbooks/USERNAME/default/` |
| **Custom** | Any valid CardDAV address book URL |

### Tags and CardDAV

When syncing, tags assigned to a contact are exported as the `CATEGORIES` field in the vCard. This is the standard way to carry labels across contact applications.

---

## Access control

### Restricting sign-ups by email domain

If you only want people from specific organizations to access QardQntac, set:

```
AUTH_WHITELISTED_DOMAINS=yourcompany.com,partner.org
```

Anyone trying to sign in with an email outside those domains will be rejected — whether they're a new user or an existing one.

Leave the variable empty (default) to allow any email address.

### Disabling registration entirely

Once your team is set up, you can prevent any new accounts from being created:

```
AUTH_ALLOW_REGISTRATION=false
```

Existing users can still sign in normally. Only new registrations are blocked.

---

## Useful commands

```bash
just up           # Start Docker (PostgreSQL) + dev server
just down         # Stop Docker services
pnpm dev          # Dev server only (Docker must already be running)
pnpm build        # Production build
pnpm check        # Lint + format (Biome)
pnpm db:generate  # Generate Drizzle migration files
pnpm db:migrate   # Apply pending migrations
pnpm email:dev    # Preview email templates
```

---

## Contributing

Contributions are welcome. Here's how to get started:

### Setup

Follow the [Installation](#installation) steps above. The development server includes hot reload — changes are reflected immediately.

### Stack

- **Framework** — Next.js (App Router)
- **Database** — PostgreSQL + Drizzle ORM
- **Auth** — Better Auth (magic links)
- **AI** — Ollama · OpenAI · Anthropic · Gemini (abstracted via `src/lib/vision/`)
- **UI** — Tailwind CSS v4, Base UI
- **i18n** — next-intl (`fr` / `en`)
- **Forms / mutations** — next-safe-action + TanStack Query

### Project structure

```
app/              Next.js routes
config/           App-wide configuration (auth, i18n, CardDAV URLs…)
db/               Drizzle schema + migrations
src/
  features/       Business logic by domain (scanner, contacts, tags, providers…)
  lib/            Shared utilities (CardDAV client, vision providers, vCard…)
```

### Guidelines

- Run `pnpm check` before submitting — the project uses [Biome](https://biomejs.dev) for linting and formatting
- Translations live in `src/features/[feature]/translations/fr.json` and `en.json` — add keys for both locales
- Server actions use `anyAuthenticatedAction` or `adminAction` from `src/lib/actions.ts` — pick the right one
- Keep PRs focused; one feature or fix per pull request

### Reporting issues

Open an issue with a clear description of the problem, steps to reproduce, and your environment (OS, Node version, AI provider used).

---

## License

MIT
