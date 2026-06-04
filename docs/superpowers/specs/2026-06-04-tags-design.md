# Contact Tags Design

**Date:** 2026-06-04  
**Status:** Approved

## Overview

Add a tag system to contacts. Users create color-coded tags, assign multiple tags per contact, and filter the contacts grid by tag. Filtering uses OR logic (contact visible if it has at least one selected tag). Tag filter combines with text search via AND.

## Database

Two new tables added via Drizzle migration:

```
tags
  id         uuid PK default random
  userId     text NOT NULL
  name       text NOT NULL
  color      text NOT NULL  (hex color string, e.g. "#6366f1")
  createdAt  timestamp NOT NULL default now()
  updatedAt  timestamp NOT NULL default now()

contact_tags
  contactId  integer NOT NULL  → contacts.id
  tagId      uuid NOT NULL     → tags.id
  PRIMARY KEY (contactId, tagId)
```

Deleting a tag cascades to `contact_tags` (all assignments removed). No cascade to contacts themselves.

## Feature Structure

New feature `src/features/app/tags/`:

```
tags/
  actions/
    list-tags.action.ts          — list user's tags
    list-contact-tags.action.ts  — fetch all contact→tag assignments for user
    create-tag.action.ts         — create new tag (name + color)
    update-tag.action.ts         — rename or recolor a tag
    delete-tag.action.ts         — delete tag + all contact_tags rows
    assign-tags.action.ts        — set tags for a contact (replace full set)
  components/
    tag-popover.tsx              — popover for assigning/removing/creating tags
    tag-chips-filter.tsx         — scrollable chips bar for filtering
  translations/
    fr.json
    en.json
```

## Components

### `TagChipsFilter`

Horizontal scroll row above the contacts grid. Props: `tags: Tag[]`, `selected: string[]`, `onChange: (ids: string[]) => void`.

- "Tous" chip always first — clears selection
- Each chip rendered with its `tag.color` (background tinted, text darker shade)
- Multi-select: clicking a chip toggles it in/out of `selected`; clicking "Tous" clears all
- Overflow hidden, `overflow-x: auto`, no wrap — swipeable on mobile
- Count badge not shown (kept minimal)

### `TagPopover`

Triggered by 4th action button (🏷) on `ContactCard`. Props: `contactId`, `assignedTagIds: string[]`, `allTags: Tag[]`, `onMutated: () => void`.

- Lists all user tags with checkbox state
- Toggle tag → calls `assignTags` action with updated set
- "+ Nouveau tag" inline form at bottom: name input + 16-color palette → `createTag` then auto-assigns
- Rename/delete per tag via small edit/delete icon buttons always visible on each row
- Uses `@radix-ui/react-popover` (already installed) — closes on outside click

### `ContactCard` updates

- Tags pills displayed below name/subtitle (max 3 visible, "+N" if more)
- 4th button added: tag icon → opens `TagPopover`
- Props extended: `tags: Tag[]` (all user tags passed from parent), `assignedTagIds: string[]`

### `ContactsGrid` updates

- Queries tags: `useQuery(["tags"])` on mount
- Renders `TagChipsFilter` between search bar and grid
- `selectedTagIds: string[]` state
- Filtering: when `selectedTagIds` non-empty, pass custom `filterFn` to TanStack Table that checks `contact.tagIds.some(id => selectedTagIds.includes(id))` — OR logic
- Contact data enriched with `tagIds` field from a join query, OR tags fetched separately and mapped client-side

### `ReviewStep` updates

- Tag multi-select field added below existing form fields (optional)
- Uses `TagPopover` component (same as on ContactCard)
- On save: `saveContact` returns `contactId`, then `assignTags(contactId, selectedTagIds)` if any tags selected

## Data Flow

`AppTabs` queries contacts. `ContactsGrid` queries tags independently. Tags are passed down to `ContactCard` and `TagChipsFilter`. Tag assignments are stored in `contact_tags` — to know which tags a contact has, `listContacts` must join `contact_tags`, or a separate `listContactTags` action is called.

**Chosen approach:** `listContacts` returns contacts as-is (no join). A separate `useQuery(["contact-tags"])` fetches all `contact_tags` for the user as a flat map `{ [contactId]: tagId[] }`. This map is passed down to enrich each card without modifying the existing `listContacts` action.

## Actions

- `listTags` — `SELECT * FROM tags WHERE userId = ?`
- `createTag(name, color)` — INSERT, returns new tag
- `updateTag(id, name?, color?)` — UPDATE with ownership check
- `deleteTag(id)` — DELETE from tags (contact_tags cascade), ownership check
- `assignTags(contactId, tagIds[])` — DELETE existing rows for contactId then INSERT new set (replace strategy)
- `listContactTags` — `SELECT contactId, tagId FROM contact_tags JOIN contacts ON contacts.id = contact_tags.contactId WHERE contacts.userId = ?`

All use `anyAuthenticatedAction`.

## i18n

New keys in `tags/translations/fr.json` and `en.json`:

```json
{
  "all": "Tous",
  "new_tag": "Nouveau tag…",
  "name_placeholder": "Nom du tag",
  "create": "Créer",
  "rename": "Renommer",
  "delete": "Supprimer",
  "assign_tags": "Tags",
  "no_tags": "Aucun tag",
  "delete_confirm": "Supprimer ce tag de tous les contacts ?"
}
```

## Color Palette (16 colors)

```
#6366f1  #8b5cf6  #ec4899  #ef4444
#f97316  #f59e0b  #eab308  #84cc16
#22c55e  #10b981  #14b8a6  #06b6d4
#3b82f6  #0ea5e9  #64748b  #1e293b
```

## Constraints

- No routing changes
- Tags are per-user (not shared across users)
- Tag name uniqueness enforced per user (DB unique constraint on `(userId, name)`)
- `assignTags` replace strategy: always sends full set of tagIds for a contact
- Mobile-first: TagChipsFilter scrolls horizontally, TagPopover fits within `max-w-420`
