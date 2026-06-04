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
- Uses `@tanstack/react-table` (headless) for filtering — renders as 2-column card grid, not `<table>`
- `useReactTable` with `globalFilter` state wired to search input; `getFilteredRowModel()` + `globalFilterFn: "includesString"` on `name`, `company`, `email` fields
- Search input at top controls `globalFilter`
- Renders `table.getRowModel().rows` as `ContactCard` components
- Empty state (0 contacts total): "Aucun contact scanné"
- No-results state (filter active, 0 rows): "Aucun résultat pour «query»"
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
- Search filtering is client-side via TanStack Table `globalFilter` — no server query

## Dependencies

- Add `@tanstack/react-table` (not yet installed — `pnpm add @tanstack/react-table`)

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

## File Structure

```
src/features/app/
├── layouts/
│   ├── dashboard.tsx                        (unchanged)
│   ├── page.tsx                             (unchanged)
│   ├── app-header.tsx                       (NEW)
│   └── app-tabs.tsx                         (NEW)
├── scanner/
│   ├── actions/
│   │   └── analyze-card.action.ts           (unchanged)
│   ├── components/
│   │   ├── scanner-wizard.tsx               (modified — remove ContactsDrawer)
│   │   └── steps/{capture,processing,review}-step.tsx (unchanged)
│   └── translations/{fr,en}.json           (trim to scanner-only keys)
├── contacts/
│   ├── actions/
│   │   ├── list-contacts.action.ts          (moved from scanner/)
│   │   ├── save-contact.action.ts           (moved from scanner/)
│   │   ├── delete-contact.action.ts         (moved from scanner/)
│   │   └── sync-contact.action.ts           (moved from scanner/)
│   ├── components/
│   │   ├── contacts-grid.tsx                (NEW — TanStack Table + grid)
│   │   └── contact-card.tsx                 (NEW — replaces contact-item.tsx)
│   └── translations/{fr,en}.json           (NEW)
└── providers/
    ├── actions/
    │   ├── list-providers.action.ts         (moved from scanner/)
    │   ├── save-provider.action.ts          (moved from scanner/)
    │   ├── delete-provider.action.ts        (moved from scanner/)
    │   └── test-provider-connection.action.ts (moved from scanner/)
    ├── components/
    │   ├── providers-manager.tsx            (moved from scanner/)
    │   └── provider-form.tsx                (moved from scanner/)
    └── translations/{fr,en}.json           (NEW — extracted from scanner/)
```

**Deleted:** `scanner/components/contacts-drawer.tsx`, `scanner/components/contact-item.tsx`

## Constraints

- `max-w-420` container kept (existing dashboard layout)
- No routing changes — stays on `/app`
- Existing sync picker + download logic reused inside `ContactCard`
- `ProvidersManager` component logic unchanged (only moved)
