# Contact Book + Sign-out Design

**Date:** 2026-06-04  
**Status:** Approved

## Overview

Replace the existing floating-button `ContactsDrawer` with an inline tab system on `/app`. Two tabs — Scanner and Contacts — share a single page with a persistent header holding user identity and sign-out. Mobile-first.

## Architecture

Single route `/app` — no new routes. The `ScannerWizard` component becomes one tab; a new `ContactsGrid` component becomes the other. A new `AppHeader` wraps both with avatar dropdown. The `ContactsDrawer` floating button is removed entirely.

```
app/(app)/app/page.tsx
  └── AppTabs
        ├── AppHeader (title + avatar → dropdown)
        ├── TabToggle (Scanner | Contacts + badge)
        ├── [scanner tab] → existing ScannerWizard content (no ContactsDrawer)
        └── [contacts tab] → ContactsGrid + search + ProvidersManager (⚙️)
```

## Components

### `AppHeader`
- Left: app title "Kardqntact"
- Right: avatar circle with user initials
- Click avatar → dropdown: user email (read-only) + "Se déconnecter" button (red)
- Sign-out calls Better Auth `authClient.signOut()` then redirects to `/portal`
- Mobile: full width, `sticky top-0 z-50`

### `TabToggle`
- Two segments: `📷 Scanner` / `📇 Contacts`
- Contacts segment shows badge with contact count (hidden when 0)
- Active tab highlighted with primary color, inactive muted
- Controlled state: `useState<"scanner" | "contacts">`

### `ContactsGrid`
- Search input at top (client-side filter on `contact.name`, `contact.company`, `contact.email`)
- 2-column grid of `ContactCard` components
- Empty state: "Aucun contact scanné"
- No-results state: "Aucun résultat pour «query»"
- ⚙️ icon button top-right → toggles `ProvidersManager` panel (existing component)

### `ContactCard`
- Avatar circle with initials (2 chars, colored by hash of name)
- Name (truncated), company or email subtitle
- Sync status: green "✅ Synchronisé · ProviderLabel" if `contact.providerId` set
- Action row (3 icon buttons): download vCard, sync to provider, delete
- Sync button: if 1 provider → direct sync; if multiple → provider picker sheet
- Delete: no confirmation dialog (existing behavior)

## Data

- `useQuery(["contacts"])` on mount (no `enabled` gate — always loaded in contacts tab)
- `useQuery(["providers"])` on mount same tab
- Both refetch after any mutation (save, delete, sync)
- Search filtering is client-side only — no server query

## Removals

- `ContactsDrawer` component — deleted
- Floating `<ContactsDrawer />` in `ScannerWizard` — removed
- `contacts-drawer.tsx` file — deleted

## Sign-out

```ts
import { authClient } from "@/lib/auth/client"
await authClient.signOut()
// redirect to /portal
```

Dropdown closes on outside click (standard shadcn `DropdownMenu` or `Popover`).

## i18n

New keys needed in `scanner/translations/fr.json` and `en.json`:

```json
"tabs": {
  "scanner": "Scanner",
  "contacts": "Contacts"
},
"header": {
  "sign_out": "Se déconnecter"
},
"contacts_grid": {
  "search_placeholder": "Rechercher…",
  "no_results": "Aucun résultat pour «{query}»"
}
```

## Constraints

- `max-w-420` container kept (existing dashboard layout)
- No routing changes — stays on `/app`
- Existing `ContactItem` logic (sync picker, download) reused inside `ContactCard`
- `ProvidersManager` component unchanged
