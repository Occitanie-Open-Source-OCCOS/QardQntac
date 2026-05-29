# KardQntact

Analyseur de cartes de visite open source. Prenez en photo une carte de visite → l'IA extrait les informations → sauvegardez dans votre carnet de contacts, exportez en vCard ou synchronisez vers un serveur CardDAV.

## Fonctionnalités

- **Scan de cartes de visite** — capture par caméra (live preview) ou galerie
- **Extraction automatique** — via un modèle de vision local (Ollama), aucune donnée envoyée à l'extérieur
- **Gestion des contacts** — liste, téléchargement vCard, détection des doublons
- **Sync CardDAV** — Radicale, Baikal, Nextcloud ou serveur personnalisé
- **Multi-providers** — configurez plusieurs serveurs CardDAV, choisissez le provider par contact
- **Authentification** — magic link uniquement, accès restreint par domaine email

## Prérequis

- **Node.js** ≥ 20 + **pnpm**
- **Docker** (pour PostgreSQL)
- **Ollama** avec un modèle vision (ex: `llama3.2-vision`)

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
| `OLLAMA_BASE_URL` | URL Ollama (défaut: `http://localhost:11434`) |
| `OLLAMA_MODEL` | Modèle vision Ollama (ex: `llama3.2-vision`) |

### Domaines autorisés

L'inscription est restreinte aux domaines définis dans `config/restrictions.ts`. Modifiez `WHITELISTED_DOMAINS` pour autoriser vos domaines.

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
- **IA** — Ollama (modèle vision local)
- **UI** — Tailwind CSS v4, shadcn/ui, Radix UI
- **i18n** — next-intl (fr/en)
- **Actions** — next-safe-action + TanStack Query

## Providers CardDAV supportés

| Provider | URL type |
|---|---|
| Radicale | `http://host:5232/user/contacts/` |
| Baikal | `http://host/baikal/dav.php/addressbooks/user/default/` |
| Nextcloud | `https://nextcloud.example.com/remote.php/dav/addressbooks/users/username/contacts/` |
| Personnalisé | Toute URL CardDAV standard |
