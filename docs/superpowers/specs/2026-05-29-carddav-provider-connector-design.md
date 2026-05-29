# CardDAV Provider Connector — Design Spec

**Date:** 2026-05-29
**Status:** Approved

## Goal

Replace the single `userCarddavConfig` (Radicale-only) with a multi-provider system. Each user can configure multiple CardDAV providers (Radicale, Baikal, Custom). When syncing a contact, the user picks which provider to sync to. Deletion propagates to the remote provider automatically.

## Context

- Duplicate detection already exists in `save-contact.action.ts` (email/phone/name check).
- Remote deletion on contact delete already exists in `delete-contact.action.ts`.
- Existing `src/lib/carddav.ts` implements standard CardDAV HTTP (PROPFIND/PUT/DELETE) — works for all providers since they all implement the same protocol.

---

## Architecture

### File Structure

```
src/lib/carddav/
  http.ts           — raw HTTP ops (PROPFIND, PUT, DELETE) — moved from src/lib/carddav.ts
  interface.ts      — CardDavProvider interface + CardDavCredentials type
  providers/
    radicale.ts     — RadicaleProvider
    baikal.ts       — BaikalProvider
    custom.ts       — CustomProvider
  index.ts          — getProvider(type) factory + re-exports

db/schemas/contacts.ts
  — add userCardDavProviders table (replaces userCarddavConfig)
  — contacts: add providerId FK (nullable)

src/features/app/scanner/
  actions/
    list-providers.action.ts
    save-provider.action.ts
    delete-provider.action.ts
    sync-contact.action.ts       (modified: takes providerId)
    delete-contact.action.ts     (modified: uses providerId)
  components/
    provider-form.tsx            (replaces carddav-config-form.tsx)
    providers-manager.tsx        (new)
    contacts-drawer.tsx          (modified)
    contact-item.tsx             (modified)
```

---

## Database Schema

### `user_carddav_providers` (replaces `user_carddav_config`)

| Column      | Type      | Notes                              |
|-------------|-----------|------------------------------------|
| id          | uuid PK   | `defaultRandom()`                  |
| userId      | text      | not null                           |
| type        | text      | `"radicale" \| "baikal" \| "custom"` |
| label       | text      | user-defined name, e.g. "Mon Radicale" |
| url         | text      | CardDAV book URL                   |
| username    | text      |                                    |
| password    | text      |                                    |
| createdAt   | timestamp |                                    |
| updatedAt   | timestamp |                                    |

### `contacts` — added column

| Column     | Type | Notes                                          |
|------------|------|------------------------------------------------|
| providerId | uuid | FK → `user_carddav_providers.id`, nullable     |

`remoteId` (existing) stays — holds the CardDAV UID.

### Migration strategy

1. Create `user_carddav_providers` table.
2. Migrate existing `user_carddav_config` rows → insert as `type = "radicale"`, `label = "Radicale"`.
3. Add `provider_id` column to `contacts`.
4. For contacts with `synced_at IS NOT NULL`, set `provider_id` to the migrated provider row for that user.
5. Drop `user_carddav_config`.

---

## Provider Interface

```typescript
// src/lib/carddav/interface.ts

export type CardDavCredentials = {
  url: string
  username: string
  password: string
}

export interface CardDavProvider {
  readonly type: string
  readonly name: string
  readonly urlPlaceholder: string
  readonly urlHint: string

  testConnection(creds: CardDavCredentials): Promise<void>        // throws on failure; impl: calls discoverBooks(), success = no throw
  saveContact(vcard: string, bookHref: string, creds: CardDavCredentials, remoteId?: string): Promise<string>
  deleteContact(remoteId: string, bookHref: string, creds: CardDavCredentials): Promise<void>
  discoverBooks(creds: CardDavCredentials): Promise<AddressBook[]>
}
```

### Implementations

All three implementations delegate HTTP calls to `http.ts` (identical protocol). They differ only in metadata:

| Provider          | `type`     | `urlPlaceholder`                                          |
|-------------------|------------|-----------------------------------------------------------|
| RadicaleProvider  | `radicale` | `http://host:5232/user/contacts/`                        |
| BaikalProvider    | `baikal`   | `http://host/baikal/dav.php/addressbooks/user/default/`  |
| CustomProvider    | `custom`   | `https://carddav.example.com/addressbooks/user/contacts/` |

### Factory

```typescript
// src/lib/carddav/index.ts
export function getProvider(type: string): CardDavProvider {
  switch (type) {
    case "radicale": return new RadicaleProvider()
    case "baikal":   return new BaikalProvider()
    default:         return new CustomProvider()
  }
}
```

---

## Actions

### `list-providers`
- `anyAuthenticatedAction` — no input
- Returns all `userCardDavProviders` rows for `userId` — password is write-only, never returned
- `ProviderForm` edit mode shows empty password field; user must re-enter to update password

### `save-provider`
- Input: `{ id?: string, type, label, url, username, password }`
- Upsert: insert if no `id`, update if `id` provided
- Returns `{ id }`

### `delete-provider`
- Input: `{ id: string }`
- Sets `contacts.providerId = null` for all contacts linked to this provider
- Deletes provider row

### `sync-contact` (modified)
- Input: `{ id: number, providerId: string }`
- Lookup provider config by `providerId`
- `getProvider(config.type)` → call `saveContact`
- Update `contacts`: set `remoteId`, `providerId`, `syncedAt`
- Re-sync to a different provider: just updates `providerId` + `remoteId` to new provider; old remote entry on previous provider is NOT deleted (user manages their server)

### `delete-contact` (modified)
- If `contact.providerId` exists → lookup provider → `getProvider(type).deleteContact(remoteId, ...)`
- Continue with local delete even if remote fails (log error)

---

## UI Components

### `ProviderForm` (replaces `CarddavConfigForm`)
- Type selector: Radicale / Baikal / Custom (radio or segmented control)
- Label input (free text)
- URL input — placeholder updates dynamically based on selected type
- URL hint text below input (e.g. "Radicale tourne généralement sur le port 5232")
- Username / Password inputs
- "Tester la connexion" button → calls `testConnection`, shows toast success/error
- Save button (disabled if URL/username/password empty or test pending)

### `ProvidersManager` (new, inside drawer)
- Lists configured providers: each shows label + type badge + edit/delete icons
- "Ajouter un provider" button → renders `ProviderForm` inline or in a sub-sheet
- Edit tap → pre-fills `ProviderForm` with existing values
- Delete → confirmation, then `delete-provider` action

### `ContactItem` (modified sync button)
- 0 providers configured → toast "Configurez d'abord un provider"
- 1 provider → sync directly (no picker)
- 2+ providers → bottom sheet picker listing provider labels → user picks → `sync-contact(id, providerId)`
- After sync: show provider label + sync badge on contact item

### `ContactsDrawer` (modified)
- Replace "Configurer Radicale" section with `ProvidersManager`
- Translations: add keys for provider management UI

---

## Translations (new keys needed)

```json
"providers": {
  "title": "Mes connecteurs",
  "add_btn": "Ajouter un connecteur",
  "edit": "Modifier",
  "delete": "Supprimer",
  "type_radicale": "Radicale",
  "type_baikal": "Baikal",
  "type_custom": "Personnalisé",
  "label": "Nom",
  "url_hint_radicale": "Radicale tourne généralement sur le port 5232",
  "url_hint_baikal": "URL de votre instance Baikal",
  "url_hint_custom": "URL complète du carnet d'adresses",
  "test_btn": "Tester la connexion",
  "test_success": "Connexion réussie",
  "test_failed": "Connexion échouée",
  "saved_toast": "Provider enregistré",
  "deleted_toast": "Provider supprimé",
  "pick_provider": "Choisir un provider",
  "no_providers": "Aucun provider configuré"
}
```

---

## Error Handling

- `testConnection` throws with message — shown in toast
- `sync-contact` throws if provider not found or HTTP PUT fails — shown in toast
- `delete-contact` remote failure: logged, local delete proceeds
- `delete-provider` always nullifies `providerId` on contacts before delete (no orphan FKs)
