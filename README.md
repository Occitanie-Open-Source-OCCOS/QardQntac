# KardQntact

Analyseur de cartes de visite open source. Prenez en photo une carte de visite → l'IA extrait les informations → sauvegardez dans votre carnet de contacts, exportez en vCard ou synchronisez vers un serveur CardDAV.

## Fonctionnalités

- **Scan de cartes de visite** — capture par caméra (live preview) ou galerie
- **Extraction automatique** — via Ollama (local) ou un provider cloud (OpenAI, Anthropic, Gemini), configurable via `.env`
- **Gestion des contacts** — liste, téléchargement vCard, détection des doublons
- **Sync CardDAV** — Radicale, Baikal, Nextcloud ou serveur personnalisé
- **Multi-providers** — configurez plusieurs serveurs CardDAV, choisissez le provider par contact
- **Authentification** — magic link uniquement, accès restreint par domaine email

## Prérequis

- **Node.js** ≥ 20 + **pnpm**
- **Docker** (pour PostgreSQL)
- **Ollama** avec un modèle vision (ex: `llama3.2-vision`) — ou une clé API cloud

## Installation

```bash
# Cloner le dépôt
git clone <repo-url>
cd kardqntact

# Installer les dépendances
pnpm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs
```

### Variables d'environnement requises

| Variable | Description |
|---|---|
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | URL de l'application |
| `NEXT_PUBLIC_APP_NAME` | Nom affiché (défaut: `KardQntact`) |
| `DATABASE_URL` | URL PostgreSQL |
| `BETTER_AUTH_SECRET` | Clé secrète (`openssl rand -base64 32`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Config email pour magic links |
| `VISION_PROVIDER` | Provider IA : `ollama` (défaut), `openai`, `anthropic`, `gemini` |
| `OLLAMA_BASE_URL` | URL Ollama (défaut: `http://localhost:11434`) |
| `OLLAMA_MODEL` | Modèle vision Ollama (défaut: `llama3.2-vision`) |
| `OPENAI_API_KEY` | Clé API OpenAI (requis si `VISION_PROVIDER=openai`) |
| `OPENAI_MODEL` | Modèle OpenAI (défaut: `gpt-4o`) |
| `ANTHROPIC_API_KEY` | Clé API Anthropic (requis si `VISION_PROVIDER=anthropic`) |
| `ANTHROPIC_MODEL` | Modèle Anthropic (défaut: `claude-3-5-sonnet-20241022`) |
| `GEMINI_API_KEY` | Clé API Google Gemini (requis si `VISION_PROVIDER=gemini`) |
| `GEMINI_MODEL` | Modèle Gemini (défaut: `gemini-1.5-flash`) |

### Domaines autorisés

L'inscription est restreinte aux domaines définis dans `config/restrictions.ts`. Modifiez `WHITELISTED_DOMAINS` pour autoriser vos domaines.

### Ollama (provider local)

Si vous utilisez `VISION_PROVIDER=ollama` (défaut), installez Ollama et téléchargez un modèle vision :

```bash
# Installer Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Télécharger le modèle vision (recommandé)
ollama pull llama3.2-vision

# Vérifier qu'Ollama tourne
ollama serve
```

> Le modèle `llama3.2-vision` nécessite ~5 GB de RAM GPU. Alternative plus légère : `moondream` (~1.7 GB).

## Lancement

```bash
# Démarrer PostgreSQL + serveur de dev
just up

# Appliquer les migrations
pnpm db:migrate

# Arrêter
just down
```

L'application est disponible sur `http://localhost:3000`.

## Commandes utiles

```bash
pnpm dev          # Serveur de dev seul (Docker doit tourner)
pnpm build        # Build de production
pnpm check        # Lint + format (Biome)
pnpm db:generate  # Générer les migrations Drizzle
pnpm db:migrate   # Appliquer les migrations
pnpm email:dev    # Prévisualiser les emails
```

## Stack technique

- **Framework** — Next.js 16 (App Router)
- **Base de données** — PostgreSQL + Drizzle ORM
- **Auth** — Better Auth (magic links)
- **IA** — Ollama (local) · OpenAI · Anthropic · Gemini (via `VISION_PROVIDER`)
- **UI** — Tailwind CSS v4, shadcn/ui, Radix UI
- **i18n** — next-intl (fr/en)
- **Actions** — next-safe-action + TanStack Query

## Providers IA supportés

| Provider | Variable | Modèle défaut |
|---|---|---|
| Ollama (local) | `VISION_PROVIDER=ollama` | `llama3.2-vision` |
| OpenAI | `VISION_PROVIDER=openai` + `OPENAI_API_KEY` | `gpt-4o` |
| Anthropic | `VISION_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` | `claude-3-5-sonnet-20241022` |
| Google Gemini | `VISION_PROVIDER=gemini` + `GEMINI_API_KEY` | `gemini-1.5-flash` |

## Providers CardDAV supportés

| Provider | URL type |
|---|---|
| Radicale | `http://host:5232/user/contacts/` |
| Baikal | `http://host/baikal/dav.php/addressbooks/user/default/` |
| Nextcloud | `https://nextcloud.example.com/remote.php/dav/addressbooks/users/username/contacts/` |
| Personnalisé | Toute URL CardDAV standard |
