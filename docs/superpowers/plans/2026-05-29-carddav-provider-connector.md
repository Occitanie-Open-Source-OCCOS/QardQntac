# CardDAV Provider Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `userCarddavConfig` (Radicale-only) with a multi-provider system — `userCardDavProviders` table (multiple per user), a typed `CardDavProvider` interface with Radicale/Baikal/Custom implementations, and a sync picker UI so users choose which provider to sync each contact to.

**Architecture:** `src/lib/carddav/` holds the interface, shared HTTP layer (`http.ts`), and three provider classes. Server actions cover CRUD for providers + updated sync/delete. UI: `ProviderForm` + `ProvidersManager` replace the old `CarddavConfigForm`; `ContactItem` gains a provider picker Sheet for 2+ providers.

**Tech Stack:** Next.js App Router, Drizzle ORM (PostgreSQL), next-safe-action, TanStack Query, vaul Drawer, Sheet (base-ui), Tailwind CSS 4, Zod, next-intl

---

## File Map

**Create:**
- `src/lib/carddav/interface.ts` — `CardDavProvider` interface + `CardDavCredentials` type
- `src/lib/carddav/http.ts` — raw HTTP ops (PROPFIND, PUT, DELETE) — content from existing `src/lib/carddav.ts`
- `src/lib/carddav/providers/radicale.ts` — `RadicaleProvider`
- `src/lib/carddav/providers/baikal.ts` — `BaikalProvider`
- `src/lib/carddav/providers/custom.ts` — `CustomProvider`
- `src/lib/carddav/index.ts` — `getProvider(type)` factory + re-exports
- `src/features/app/scanner/actions/list-providers.action.ts`
- `src/features/app/scanner/actions/save-provider.action.ts`
- `src/features/app/scanner/actions/delete-provider.action.ts`
- `src/features/app/scanner/actions/test-provider-connection.action.ts`
- `src/features/app/scanner/components/provider-form.tsx`
- `src/features/app/scanner/components/providers-manager.tsx`

**Modify:**
- `db/schemas/contacts.ts` — replace `userCarddavConfig` with `userCardDavProviders`, add `providerId` to `contacts`
- `db/schemas/index.ts` — update exports
- `src/features/app/scanner/actions/sync-contact.action.ts` — takes `providerId`, uses new lib
- `src/features/app/scanner/actions/delete-contact.action.ts` — uses `providerId`, uses new lib
- `src/features/app/scanner/translations/fr.json` — add `providers` section + error key
- `src/features/app/scanner/translations/en.json` — same
- `src/features/app/scanner/components/contact-item.tsx` — providers[] prop + sync picker
- `src/features/app/scanner/components/contacts-drawer.tsx` — ProvidersManager, providers query
- `src/features/app/scanner/components/scanner-wizard.tsx` — drop carddavConfig prop
- `app/(app)/app/page.tsx` — drop carddavConfig query

**Delete (Task 14):**
- `src/lib/carddav.ts`
- `src/features/app/scanner/actions/save-carddav.action.ts`
- `src/features/app/scanner/components/carddav-config-form.tsx`

---

## Task 1: DB Schema — replace userCarddavConfig with userCardDavProviders, add providerId to contacts

**Files:**
- Modify: `db/schemas/contacts.ts`

- [ ] **Step 1: Rewrite db/schemas/contacts.ts**

```typescript
import { pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userCardDavProviders = pgTable("user_carddav_providers", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id").notNull(),
	type: text("type").notNull(),
	label: text("label").notNull(),
	url: text("url").notNull(),
	username: text("username").notNull(),
	password: text("password").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contacts = pgTable("contacts", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	name: text("name").notNull().default(""),
	title: text("title").notNull().default(""),
	company: text("company").notNull().default(""),
	email: text("email").notNull().default(""),
	phone: text("phone").notNull().default(""),
	website: text("website").notNull().default(""),
	address: text("address").notNull().default(""),
	imageUrl: text("image_url"),
	remoteId: text("remote_id"),
	providerId: uuid("provider_id"),
	syncedAt: timestamp("synced_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type UserCardDavProvider = typeof userCardDavProviders.$inferSelect;
export type NewUserCardDavProvider = typeof userCardDavProviders.$inferInsert;
export type ProviderSummary = Omit<UserCardDavProvider, "password">;
```

- [ ] **Step 2: Update db/schemas/index.ts to export new types**

Open `db/schemas/index.ts`. It currently has `export * from "@/db/schemas/contacts"`. No change needed — the new types export automatically. But verify `userCarddavConfig` is gone: search the file for that name and ensure it's not re-exported separately.

- [ ] **Step 3: Verify TypeScript compiles (expect errors — we fix them in later tasks)**

```bash
pnpm check 2>&1 | grep "userCarddavConfig\|UserCarddavConfig" | head -20
```

Expected: errors listing files that still reference the old type. We fix each in subsequent tasks.

---

## Task 2: Generate and apply DB migration with data migration

**Files:**
- Generated: `db/migrations/<timestamp>_carddav_providers.sql`

- [ ] **Step 1: Generate migration**

```bash
pnpm db:generate
```

Expected: new file created at `db/migrations/XXXX_*.sql`. Note the filename.

- [ ] **Step 2: Open the generated migration file and inspect it**

The generated SQL will have:
- `CREATE TABLE "user_carddav_providers" (...)`
- `ALTER TABLE "contacts" ADD COLUMN "provider_id" uuid`
- `DROP TABLE "user_carddav_config"`

- [ ] **Step 3: Insert data migration SQL into the file**

Between the `CREATE TABLE "user_carddav_providers"` statement and the `DROP TABLE "user_carddav_config"` statement, add these two blocks:

```sql
-- Migrate existing Radicale configs to new providers table
INSERT INTO "user_carddav_providers" ("id", "user_id", "type", "label", "url", "username", "password", "created_at", "updated_at")
SELECT gen_random_uuid(), "user_id", 'radicale', 'Radicale', "url", "username", "password", "created_at", "updated_at"
FROM "user_carddav_config";

-- Link previously-synced contacts to their migrated provider
UPDATE "contacts" c
SET "provider_id" = p."id"
FROM "user_carddav_providers" p
WHERE c."user_id" = p."user_id"
  AND c."synced_at" IS NOT NULL;
```

- [ ] **Step 4: Apply migration**

```bash
pnpm db:migrate
```

Expected: migration applied, no errors.

- [ ] **Step 5: Commit**

```bash
git add db/schemas/contacts.ts db/migrations/
git commit -m "feat: add user_carddav_providers table, add provider_id to contacts"
```

---

## Task 3: Create src/lib/carddav/interface.ts and src/lib/carddav/http.ts

**Files:**
- Create: `src/lib/carddav/interface.ts`
- Create: `src/lib/carddav/http.ts`

- [ ] **Step 1: Create src/lib/carddav/interface.ts**

```typescript
import type { AddressBook } from "@/lib/types";

export type CardDavCredentials = {
	url: string;
	username: string;
	password: string;
};

export interface CardDavProvider {
	readonly type: string;
	readonly name: string;
	readonly urlPlaceholder: string;
	readonly urlHint: string;

	/** Throws on failure. Implementation calls discoverBooks() — success = no throw. */
	testConnection(creds: CardDavCredentials): Promise<void>;
	saveContact(vcard: string, bookHref: string, creds: CardDavCredentials, remoteId?: string): Promise<string>;
	deleteContact(remoteId: string, bookHref: string, creds: CardDavCredentials): Promise<void>;
	discoverBooks(creds: CardDavCredentials): Promise<AddressBook[]>;
}
```

- [ ] **Step 2: Create src/lib/carddav/http.ts — copy content from src/lib/carddav.ts**

```typescript
import type { AddressBook } from "@/lib/types";
import type { CardDavCredentials } from "./interface";

function basicAuth(username: string, password: string): string {
	return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function parseAddressBooks(xml: string): AddressBook[] {
	const books: AddressBook[] = [];
	const responsePattern = /<(?:\w+:)?response\b[^>]*>([\s\S]*?)<\/(?:\w+:)?response>/gi;
	let match = responsePattern.exec(xml);
	while (match !== null) {
		const block = match[1];
		const resourcetypeMatch = /<(?:\w+:)?resourcetype\b[^>]*>([\s\S]*?)<\/(?:\w+:)?resourcetype>/i.exec(block);
		if (resourcetypeMatch && /addressbook/i.test(resourcetypeMatch[1])) {
			const hrefMatch = /<(?:\w+:)?href\b[^>]*>([^<]+)<\/(?:\w+:)?href>/i.exec(block);
			const nameMatch = /<(?:\w+:)?displayname\b[^>]*>([^<]*)<\/(?:\w+:)?displayname>/i.exec(block);
			if (hrefMatch?.[1]) {
				books.push({
					href: hrefMatch[1].trim(),
					name: nameMatch?.[1].trim() || hrefMatch[1].trim(),
				});
			}
		}
		match = responsePattern.exec(xml);
	}
	return books;
}

export async function discoverBooks(credentials: CardDavCredentials): Promise<AddressBook[]> {
	const { url, username, password } = credentials;
	const res = await fetch(url, {
		method: "PROPFIND",
		headers: {
			Authorization: basicAuth(username, password),
			Depth: "1",
			"Content-Type": "application/xml; charset=utf-8",
		},
		body: `<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop><displayname/><resourcetype/></prop></propfind>`,
	});
	if (!res.ok) throw new Error(`PROPFIND failed: ${res.status}`);
	return parseAddressBooks(await res.text());
}

export async function saveContact(
	vcardString: string,
	bookHref: string,
	credentials: CardDavCredentials,
	remoteId?: string,
): Promise<string> {
	const { url, username, password } = credentials;
	const uid = remoteId || crypto.randomUUID();
	const bookBase = bookHref.startsWith("http")
		? bookHref.replace(/\/?$/, "/")
		: `${new URL(url).origin}${bookHref.replace(/\/?$/, "/")}`;
	const contactUrl = `${bookBase}${uid}.vcf`;
	const vcardWithUid = vcardString.replace(/\r?\nEND:VCARD/, `\r\nUID:${uid}\r\nEND:VCARD`);
	const res = await fetch(contactUrl, {
		method: "PUT",
		headers: {
			Authorization: basicAuth(username, password),
			"Content-Type": "text/vcard; charset=utf-8",
		},
		body: vcardWithUid,
	});
	if (!res.ok) throw new Error(`PUT failed: ${res.status} ${res.statusText}`);
	return uid;
}

export async function deleteContact(
	remoteId: string,
	bookHref: string,
	credentials: CardDavCredentials,
): Promise<void> {
	const { url, username, password } = credentials;
	const bookBase = bookHref.startsWith("http")
		? bookHref.replace(/\/?$/, "/")
		: `${new URL(url).origin}${bookHref.replace(/\/?$/, "/")}`;
	const contactUrl = `${bookBase}${remoteId}.vcf`;
	const res = await fetch(contactUrl, {
		method: "DELETE",
		headers: {
			Authorization: basicAuth(username, password),
		},
	});
	if (!res.ok && res.status !== 404) {
		throw new Error(`DELETE failed: ${res.status} ${res.statusText}`);
	}
}
```

- [ ] **Step 3: Verify no TypeScript errors in new files**

```bash
pnpm check 2>&1 | grep "carddav/" | head -10
```

Expected: no errors from the new files.

---

## Task 4: Create provider implementations and factory

**Files:**
- Create: `src/lib/carddav/providers/radicale.ts`
- Create: `src/lib/carddav/providers/baikal.ts`
- Create: `src/lib/carddav/providers/custom.ts`
- Create: `src/lib/carddav/index.ts`

- [ ] **Step 1: Create src/lib/carddav/providers/radicale.ts**

```typescript
import type { AddressBook } from "@/lib/types";
import * as http from "../http";
import type { CardDavCredentials, CardDavProvider } from "../interface";

export class RadicaleProvider implements CardDavProvider {
	readonly type = "radicale";
	readonly name = "Radicale";
	readonly urlPlaceholder = "http://host:5232/user/contacts/";
	readonly urlHint = "Radicale tourne généralement sur le port 5232";

	async testConnection(creds: CardDavCredentials): Promise<void> {
		await http.discoverBooks(creds);
	}

	async saveContact(vcard: string, bookHref: string, creds: CardDavCredentials, remoteId?: string): Promise<string> {
		return http.saveContact(vcard, bookHref, creds, remoteId);
	}

	async deleteContact(remoteId: string, bookHref: string, creds: CardDavCredentials): Promise<void> {
		return http.deleteContact(remoteId, bookHref, creds);
	}

	async discoverBooks(creds: CardDavCredentials): Promise<AddressBook[]> {
		return http.discoverBooks(creds);
	}
}
```

- [ ] **Step 2: Create src/lib/carddav/providers/baikal.ts**

```typescript
import type { AddressBook } from "@/lib/types";
import * as http from "../http";
import type { CardDavCredentials, CardDavProvider } from "../interface";

export class BaikalProvider implements CardDavProvider {
	readonly type = "baikal";
	readonly name = "Baikal";
	readonly urlPlaceholder = "http://host/baikal/dav.php/addressbooks/user/default/";
	readonly urlHint = "URL de votre instance Baikal (dav.php/addressbooks/…)";

	async testConnection(creds: CardDavCredentials): Promise<void> {
		await http.discoverBooks(creds);
	}

	async saveContact(vcard: string, bookHref: string, creds: CardDavCredentials, remoteId?: string): Promise<string> {
		return http.saveContact(vcard, bookHref, creds, remoteId);
	}

	async deleteContact(remoteId: string, bookHref: string, creds: CardDavCredentials): Promise<void> {
		return http.deleteContact(remoteId, bookHref, creds);
	}

	async discoverBooks(creds: CardDavCredentials): Promise<AddressBook[]> {
		return http.discoverBooks(creds);
	}
}
```

- [ ] **Step 3: Create src/lib/carddav/providers/custom.ts**

```typescript
import type { AddressBook } from "@/lib/types";
import * as http from "../http";
import type { CardDavCredentials, CardDavProvider } from "../interface";

export class CustomProvider implements CardDavProvider {
	readonly type = "custom";
	readonly name = "Personnalisé";
	readonly urlPlaceholder = "https://carddav.example.com/addressbooks/user/contacts/";
	readonly urlHint = "URL complète du carnet d'adresses CardDAV";

	async testConnection(creds: CardDavCredentials): Promise<void> {
		await http.discoverBooks(creds);
	}

	async saveContact(vcard: string, bookHref: string, creds: CardDavCredentials, remoteId?: string): Promise<string> {
		return http.saveContact(vcard, bookHref, creds, remoteId);
	}

	async deleteContact(remoteId: string, bookHref: string, creds: CardDavCredentials): Promise<void> {
		return http.deleteContact(remoteId, bookHref, creds);
	}

	async discoverBooks(creds: CardDavCredentials): Promise<AddressBook[]> {
		return http.discoverBooks(creds);
	}
}
```

- [ ] **Step 4: Create src/lib/carddav/index.ts**

```typescript
export * from "./interface";
export * from "./http";

import type { CardDavProvider } from "./interface";
import { BaikalProvider } from "./providers/baikal";
import { CustomProvider } from "./providers/custom";
import { RadicaleProvider } from "./providers/radicale";

export function getProvider(type: string): CardDavProvider {
	switch (type) {
		case "radicale":
			return new RadicaleProvider();
		case "baikal":
			return new BaikalProvider();
		default:
			return new CustomProvider();
	}
}

export const PROVIDER_TYPES = ["radicale", "baikal", "custom"] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];
```

- [ ] **Step 5: Verify no TypeScript errors in carddav/**

```bash
pnpm check 2>&1 | grep "carddav" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/carddav/
git commit -m "feat: add CardDavProvider interface, http layer, and provider implementations"
```

---

## Task 5: Create provider server actions

**Files:**
- Create: `src/features/app/scanner/actions/list-providers.action.ts`
- Create: `src/features/app/scanner/actions/save-provider.action.ts`
- Create: `src/features/app/scanner/actions/delete-provider.action.ts`
- Create: `src/features/app/scanner/actions/test-provider-connection.action.ts`

- [ ] **Step 1: Create list-providers.action.ts**

```typescript
"use server";

import { eq } from "drizzle-orm";
import { userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const listProviders = anyAuthenticatedAction.action(async ({ ctx: { userId } }) => {
	return db
		.select({
			id: userCardDavProviders.id,
			userId: userCardDavProviders.userId,
			type: userCardDavProviders.type,
			label: userCardDavProviders.label,
			url: userCardDavProviders.url,
			username: userCardDavProviders.username,
			createdAt: userCardDavProviders.createdAt,
			updatedAt: userCardDavProviders.updatedAt,
		})
		.from(userCardDavProviders)
		.where(eq(userCardDavProviders.userId, userId));
});
```

- [ ] **Step 2: Create save-provider.action.ts**

```typescript
"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const saveProvider = anyAuthenticatedAction
	.schema(
		z.object({
			id: z.string().uuid().optional(),
			type: z.enum(["radicale", "baikal", "custom"]),
			label: z.string().min(1),
			url: z.string().min(1),
			username: z.string().min(1),
			password: z.string().optional(),
		}),
	)
	.action(async ({ parsedInput: { id, type, label, url, username, password }, ctx: { userId } }) => {
		if (id) {
			const updates: Record<string, unknown> = { type, label, url, username, updatedAt: new Date() };
			if (password) updates.password = password;
			await db
				.update(userCardDavProviders)
				.set(updates)
				.where(and(eq(userCardDavProviders.id, id), eq(userCardDavProviders.userId, userId)));
			return { id };
		}
		if (!password) throw new Error("Password required for new provider");
		const [row] = await db
			.insert(userCardDavProviders)
			.values({ userId, type, label, url, username, password })
			.returning({ id: userCardDavProviders.id });
		return { id: row.id };
	});
```

- [ ] **Step 3: Create delete-provider.action.ts**

```typescript
"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const deleteProvider = anyAuthenticatedAction
	.schema(z.object({ id: z.string().uuid() }))
	.action(async ({ parsedInput: { id }, ctx: { userId } }) => {
		await db
			.update(contacts)
			.set({ providerId: null })
			.where(and(eq(contacts.userId, userId), eq(contacts.providerId, id)));
		await db
			.delete(userCardDavProviders)
			.where(and(eq(userCardDavProviders.id, id), eq(userCardDavProviders.userId, userId)));
	});
```

- [ ] **Step 4: Create test-provider-connection.action.ts**

```typescript
"use server";

import { z } from "zod";
import { anyAuthenticatedAction } from "@/lib/actions";
import { getProvider } from "@/lib/carddav";

export const testProviderConnection = anyAuthenticatedAction
	.schema(
		z.object({
			type: z.enum(["radicale", "baikal", "custom"]),
			url: z.string().min(1),
			username: z.string().min(1),
			password: z.string().min(1),
		}),
	)
	.action(async ({ parsedInput: { type, url, username, password } }) => {
		const provider = getProvider(type);
		await provider.testConnection({ url, username, password });
	});
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
pnpm check 2>&1 | grep "list-providers\|save-provider\|delete-provider\|test-provider" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/app/scanner/actions/list-providers.action.ts \
        src/features/app/scanner/actions/save-provider.action.ts \
        src/features/app/scanner/actions/delete-provider.action.ts \
        src/features/app/scanner/actions/test-provider-connection.action.ts
git commit -m "feat: add list/save/delete/test provider actions"
```

---

## Task 6: Update sync-contact.action.ts

**Files:**
- Modify: `src/features/app/scanner/actions/sync-contact.action.ts`

- [ ] **Step 1: Rewrite sync-contact.action.ts**

```typescript
"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { getProvider } from "@/lib/carddav";
import { db } from "@/lib/db";
import { generateVCard } from "@/lib/vcf";

export const syncContact = anyAuthenticatedAction
	.schema(z.object({ id: z.number(), providerId: z.string().uuid() }))
	.action(async ({ parsedInput: { id, providerId }, ctx: { userId } }) => {
		const [config] = await db
			.select()
			.from(userCardDavProviders)
			.where(and(eq(userCardDavProviders.id, providerId), eq(userCardDavProviders.userId, userId)));
		if (!config) throw new Error("Provider introuvable");

		const [contact] = await db
			.select()
			.from(contacts)
			.where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
		if (!contact) throw new Error("Contact introuvable");

		const vcard = generateVCard(contact);
		const provider = getProvider(config.type);
		const remoteId = await provider.saveContact(
			vcard,
			config.url,
			{ url: config.url, username: config.username, password: config.password },
			contact.remoteId || undefined,
		);

		await db
			.update(contacts)
			.set({ syncedAt: new Date(), remoteId, providerId })
			.where(eq(contacts.id, id));
	});
```

- [ ] **Step 2: Verify**

```bash
pnpm check 2>&1 | grep "sync-contact" | head -5
```

Expected: no errors.

---

## Task 7: Update delete-contact.action.ts

**Files:**
- Modify: `src/features/app/scanner/actions/delete-contact.action.ts`

- [ ] **Step 1: Rewrite delete-contact.action.ts**

```typescript
"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { getProvider } from "@/lib/carddav";
import { db } from "@/lib/db";

export const deleteContact = anyAuthenticatedAction
	.schema(z.object({ id: z.number() }))
	.action(async ({ parsedInput: { id }, ctx: { userId } }) => {
		const [contact] = await db
			.select()
			.from(contacts)
			.where(and(eq(contacts.id, id), eq(contacts.userId, userId)));

		if (contact?.remoteId && contact.providerId) {
			const [config] = await db
				.select()
				.from(userCardDavProviders)
				.where(eq(userCardDavProviders.id, contact.providerId));

			if (config) {
				try {
					const provider = getProvider(config.type);
					await provider.deleteContact(contact.remoteId, config.url, {
						url: config.url,
						username: config.username,
						password: config.password,
					});
				} catch (e) {
					console.error("Failed to delete from remote:", e);
				}
			}
		}

		await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
	});
```

- [ ] **Step 2: Commit tasks 6 + 7**

```bash
git add src/features/app/scanner/actions/sync-contact.action.ts \
        src/features/app/scanner/actions/delete-contact.action.ts
git commit -m "feat: update sync/delete actions to use provider interface"
```

---

## Task 8: Update translations

**Files:**
- Modify: `src/features/app/scanner/translations/fr.json`
- Modify: `src/features/app/scanner/translations/en.json`

- [ ] **Step 1: Add providers section to fr.json**

In `fr.json`, add a `"providers"` key at the same level as `"capture"`, `"drawer"`, etc., and add `"no_providers_configured"` to the `"errors"` section:

```json
"providers": {
  "title": "Mes providers",
  "add_btn": "Ajouter un provider",
  "edit": "Modifier",
  "delete": "Supprimer",
  "label": "Nom",
  "username": "Identifiant",
  "password": "Mot de passe",
  "test_btn": "Tester la connexion",
  "test_success": "Connexion réussie",
  "test_failed": "Connexion échouée",
  "save_btn": "Enregistrer",
  "cancel_btn": "Annuler",
  "saved_toast": "Provider enregistré",
  "deleted_toast": "Provider supprimé",
  "pick_provider": "Choisir un provider",
  "no_providers": "Aucun provider configuré"
}
```

In the `"errors"` section, add:
```json
"no_providers_configured": "Configurez d'abord un provider"
```

- [ ] **Step 2: Add providers section to en.json**

Same structure in `en.json`:

```json
"providers": {
  "title": "My providers",
  "add_btn": "Add a provider",
  "edit": "Edit",
  "delete": "Delete",
  "label": "Name",
  "username": "Username",
  "password": "Password",
  "test_btn": "Test connection",
  "test_success": "Connection successful",
  "test_failed": "Connection failed",
  "save_btn": "Save",
  "cancel_btn": "Cancel",
  "saved_toast": "Provider saved",
  "deleted_toast": "Provider deleted",
  "pick_provider": "Choose a provider",
  "no_providers": "No providers configured"
}
```

In the `"errors"` section, add:
```json
"no_providers_configured": "Configure a provider first"
```

- [ ] **Step 3: Commit**

```bash
git add src/features/app/scanner/translations/
git commit -m "feat: add provider management translations"
```

---

## Task 9: Build ProviderForm component

**Files:**
- Create: `src/features/app/scanner/components/provider-form.tsx`

- [ ] **Step 1: Create provider-form.tsx**

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProviderSummary } from "@/db/schemas/contacts";
import type { ProviderType } from "@/lib/carddav";
import { saveProvider } from "../actions/save-provider.action";
import { testProviderConnection } from "../actions/test-provider-connection.action";

const PROVIDER_META: Record<ProviderType, { name: string; urlPlaceholder: string; urlHint: string }> = {
	radicale: {
		name: "Radicale",
		urlPlaceholder: "http://host:5232/user/contacts/",
		urlHint: "Radicale tourne généralement sur le port 5232",
	},
	baikal: {
		name: "Baikal",
		urlPlaceholder: "http://host/baikal/dav.php/addressbooks/user/default/",
		urlHint: "URL de votre instance Baikal (dav.php/addressbooks/…)",
	},
	custom: {
		name: "Personnalisé",
		urlPlaceholder: "https://carddav.example.com/addressbooks/user/contacts/",
		urlHint: "URL complète du carnet d'adresses CardDAV",
	},
};

interface ProviderFormProps {
	initial?: ProviderSummary | null;
	onSaved: () => void;
	onCancel: () => void;
}

export function ProviderForm({ initial, onSaved, onCancel }: ProviderFormProps) {
	const t = useTranslations("scanner.providers");
	const [providerType, setProviderType] = useState<ProviderType>((initial?.type as ProviderType) ?? "radicale");
	const [label, setLabel] = useState(initial?.label ?? "");
	const [url, setUrl] = useState(initial?.url ?? "");
	const [username, setUsername] = useState(initial?.username ?? "");
	const [password, setPassword] = useState("");

	const meta = PROVIDER_META[providerType];

	const { execute: execSave, isPending: isSaving } = useAction(saveProvider, {
		onSuccess: () => {
			toast.success(t("saved_toast"));
			onSaved();
		},
		onError: ({ error }) => toast.error(error.serverError ?? "Erreur"),
	});

	const { execute: execTest, isPending: isTesting } = useAction(testProviderConnection, {
		onSuccess: () => toast.success(t("test_success")),
		onError: ({ error }) => toast.error(`${t("test_failed")}: ${error.serverError ?? "Erreur réseau"}`),
	});

	const canTest = !!url && !!username && !!password;
	const canSave = !!label && !!url && !!username && (!!initial || !!password);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				execSave({ id: initial?.id, type: providerType, label, url, username, password: password || undefined });
			}}
			className="flex flex-col gap-3"
		>
			<div className="flex gap-1">
				{(["radicale", "baikal", "custom"] as ProviderType[]).map((pt) => (
					<button
						key={pt}
						type="button"
						onClick={() => setProviderType(pt)}
						className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
							providerType === pt
								? "bg-primary text-primary-foreground border-primary"
								: "bg-background text-muted-foreground border-border hover:border-primary"
						}`}
					>
						{PROVIDER_META[pt].name}
					</button>
				))}
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("label")}</label>
				<Input
					type="text"
					value={label}
					onChange={(e) => setLabel(e.target.value)}
					placeholder={meta.name}
					className="bg-background h-10 px-3 py-2 text-sm"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL</label>
				<Input
					type="url"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder={meta.urlPlaceholder}
					className="bg-background h-10 px-3 py-2 text-sm"
				/>
				<p className="text-xs text-muted-foreground">{meta.urlHint}</p>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("username")}</label>
				<Input
					type="text"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					className="bg-background h-10 px-3 py-2 text-sm"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("password")}</label>
				<Input
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder={initial ? "••••••••" : ""}
					className="bg-background h-10 px-3 py-2 text-sm"
				/>
			</div>

			<div className="flex gap-2 mt-1">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={!canTest || isTesting}
					onClick={() => execTest({ type: providerType, url, username, password })}
					className="flex-1"
				>
					{isTesting ? "…" : t("test_btn")}
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
					{t("cancel_btn")}
				</Button>
				<Button type="submit" size="sm" disabled={!canSave || isSaving} className="flex-1">
					{t("save_btn")}
				</Button>
			</div>
		</form>
	);
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
pnpm check 2>&1 | grep "provider-form" | head -5
```

---

## Task 10: Build ProvidersManager component

**Files:**
- Create: `src/features/app/scanner/components/providers-manager.tsx`

- [ ] **Step 1: Create providers-manager.tsx**

```typescript
"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ProviderSummary } from "@/db/schemas/contacts";
import { deleteProvider } from "../actions/delete-provider.action";
import { ProviderForm } from "./provider-form";

interface ProvidersManagerProps {
	providers: ProviderSummary[];
	onMutated: () => void;
}

export function ProvidersManager({ providers, onMutated }: ProvidersManagerProps) {
	const t = useTranslations("scanner.providers");
	const [editingId, setEditingId] = useState<string | "new" | null>(null);

	const { execute: execDelete } = useAction(deleteProvider, {
		onSuccess: () => {
			toast.success(t("deleted_toast"));
			onMutated();
		},
	});

	const editing = editingId === "new" ? null : (providers.find((p) => p.id === editingId) ?? null);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<p className="text-sm font-semibold">{t("title")}</p>
				<Button size="icon-xs" variant="ghost" onClick={() => setEditingId("new")} title={t("add_btn")}>
					<PlusIcon className="size-3.5" />
				</Button>
			</div>

			{editingId !== null && (
				<div className="p-3 rounded-xl bg-muted border border-border">
					<ProviderForm
						initial={editing}
						onSaved={() => {
							setEditingId(null);
							onMutated();
						}}
						onCancel={() => setEditingId(null)}
					/>
				</div>
			)}

			{providers.length === 0 && editingId === null && (
				<p className="text-xs text-muted-foreground text-center py-2">{t("no_providers")}</p>
			)}

			{providers.map((p) => (
				<div key={p.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium truncate">{p.label}</p>
						<p className="text-xs text-muted-foreground capitalize">{p.type}</p>
					</div>
					<Button size="icon-xs" variant="ghost" onClick={() => setEditingId(p.id)} title={t("edit")}>
						<PencilIcon className="size-3.5" />
					</Button>
					<Button
						size="icon-xs"
						variant="ghost"
						className="text-red-500 hover:text-red-600"
						onClick={() => execDelete({ id: p.id })}
						title={t("delete")}
					>
						<Trash2Icon className="size-3.5" />
					</Button>
				</div>
			))}
		</div>
	);
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check 2>&1 | grep "providers-manager" | head -5
```

---

## Task 11: Update ContactItem for multi-provider sync picker

**Files:**
- Modify: `src/features/app/scanner/components/contact-item.tsx`

- [ ] **Step 1: Rewrite contact-item.tsx**

```typescript
"use client";

import { DownloadIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Contact } from "@/db/schemas/contacts";
import type { ProviderSummary } from "@/db/schemas/contacts";
import { downloadVCard } from "@/lib/vcf";
import { deleteContact } from "../actions/delete-contact.action";
import { syncContact } from "../actions/sync-contact.action";

interface ContactItemProps {
	contact: Contact;
	providers: ProviderSummary[];
	onMutated: () => void;
}

export function ContactItem({ contact, providers, onMutated }: ContactItemProps) {
	const t = useTranslations("scanner.drawer");
	const tProviders = useTranslations("scanner.providers");
	const tErrors = useTranslations("scanner.errors");
	const [showPicker, setShowPicker] = useState(false);

	const { execute: execDelete, isPending: isDeleting } = useAction(deleteContact, {
		onSuccess: onMutated,
		onError: () => toast.error(tErrors("delete_failed")),
	});

	const { execute: execSync, isPending: isSyncing } = useAction(syncContact, {
		onSuccess: () => {
			toast.success(t("synced_label"));
			setShowPicker(false);
			onMutated();
		},
		onError: ({ error }) => toast.error(error.serverError ?? tErrors("sync_failed")),
	});

	const handleSyncClick = () => {
		if (providers.length === 0) {
			toast.error(tErrors("no_providers_configured"));
			return;
		}
		if (providers.length === 1) {
			execSync({ id: contact.id, providerId: providers[0].id });
			return;
		}
		setShowPicker((v) => !v);
	};

	const initials = contact.name
		? contact.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "?";

	const syncedProvider = providers.find((p) => p.id === contact.providerId);

	return (
		<div className="border-b border-border last:border-0">
			<div className="flex items-center gap-3 py-3">
				<div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
					{initials}
				</div>
				<div className="flex-1 min-w-0">
					<p className="font-medium text-sm truncate">{contact.name || "—"}</p>
					<p className="text-xs text-muted-foreground truncate">{contact.company || contact.email || ""}</p>
					{syncedProvider && (
						<p className="text-xs text-green-600">
							{t("synced_label")} · {syncedProvider.label}
						</p>
					)}
				</div>
				<div className="flex gap-1 shrink-0">
					<Button size="icon-xs" variant="ghost" onClick={() => downloadVCard(contact)} title={t("download_vcf")}>
						<DownloadIcon className="size-3.5" />
					</Button>
					<Button
						size="icon-xs"
						variant="ghost"
						disabled={isSyncing}
						onClick={handleSyncClick}
						title={t("sync_radicale")}
					>
						<RefreshCwIcon className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
					</Button>
					<Button
						size="icon-xs"
						variant="ghost"
						disabled={isDeleting}
						onClick={() => execDelete({ id: contact.id })}
						title={t("delete")}
						className="text-red-500 hover:text-red-600"
					>
						<Trash2Icon className="size-3.5" />
					</Button>
				</div>
			</div>

			{showPicker && (
				<div className="pb-2 flex flex-col gap-1">
					<p className="text-xs text-muted-foreground px-1 mb-1">{tProviders("pick_provider")}</p>
					{providers.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => execSync({ id: contact.id, providerId: p.id })}
							disabled={isSyncing}
							className="text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors flex items-center justify-between"
						>
							<span>{p.label}</span>
							<span className="text-xs text-muted-foreground capitalize">{p.type}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check 2>&1 | grep "contact-item" | head -5
```

---

## Task 12: Update ContactsDrawer

**Files:**
- Modify: `src/features/app/scanner/components/contacts-drawer.tsx`

- [ ] **Step 1: Rewrite contacts-drawer.tsx**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { SettingsIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import type { ProviderSummary } from "@/db/schemas/contacts";
import { listContacts } from "../actions/list-contacts.action";
import { listProviders } from "../actions/list-providers.action";
import { ContactItem } from "./contact-item";
import { ProvidersManager } from "./providers-manager";

export function ContactsDrawer() {
	const t = useTranslations("scanner.drawer");
	const [open, setOpen] = useState(false);
	const [showProviders, setShowProviders] = useState(false);

	const { data: contacts = [], refetch: refetchContacts } = useQuery({
		queryKey: ["contacts"],
		queryFn: async () => {
			const result = await listContacts();
			return result?.data ?? [];
		},
		enabled: open,
	});

	const { data: providers = [], refetch: refetchProviders } = useQuery({
		queryKey: ["providers"],
		queryFn: async () => {
			const result = await listProviders();
			return (result?.data ?? []) as ProviderSummary[];
		},
		enabled: open,
	});

	return (
		<>
			<Button
				size="icon"
				variant="outline"
				className="fixed top-4 right-4 z-50 shadow-md border-primary"
				onClick={() => setOpen(true)}
				title={t("title")}
			>
				<UsersIcon className="size-4" />
				{contacts.length > 0 && (
					<span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
						{contacts.length > 99 ? "99+" : contacts.length}
					</span>
				)}
			</Button>

			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerTrigger className="hidden" />
				<DrawerContent className="max-h-[85vh]">
					<DrawerHeader className="flex flex-row items-center justify-between">
						<DrawerTitle>{t("title")}</DrawerTitle>
						<Button
							size="icon-xs"
							variant="ghost"
							onClick={() => setShowProviders((v) => !v)}
							title={t("configure_carddav")}
							className="text-primary"
						>
							<SettingsIcon className="size-4" />
						</Button>
					</DrawerHeader>

					<div className="px-4 pb-8 overflow-y-auto">
						{showProviders && (
							<div className="mb-4 p-4 rounded-xl bg-muted border border-border">
								<ProvidersManager
									providers={providers}
									onMutated={() => {
										refetchProviders();
										refetchContacts();
									}}
								/>
							</div>
						)}

						{contacts.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-8">{t("empty")}</p>
						) : (
							contacts.map((contact) => (
								<ContactItem
									key={contact.id}
									contact={contact}
									providers={providers}
									onMutated={refetchContacts}
								/>
							))
						)}
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check 2>&1 | grep "contacts-drawer" | head -5
```

---

## Task 13: Update ScannerWizard and app/page.tsx

**Files:**
- Modify: `src/features/app/scanner/components/scanner-wizard.tsx`
- Modify: `app/(app)/app/page.tsx`

- [ ] **Step 1: Update scanner-wizard.tsx — drop carddavConfig prop**

Remove the `ScannerWizardProps` interface, the `carddavConfig` prop, and the prop passed to `ContactsDrawer`. Update `ContactsDrawer` call to have no props.

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import type { ContactData } from "@/lib/types";
import { ContactsDrawer } from "./contacts-drawer";
import { CaptureStep } from "./steps/capture-step";
import { ProcessingStep } from "./steps/processing-step";
import { ReviewStep } from "./steps/review-step";

type Step = "capture" | "processing" | "review";

export function ScannerWizard() {
	const tErrors = useTranslations("scanner.errors");
	const [step, setStep] = useState<Step>("capture");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [imageUrl, setImageUrl] = useState("");
	const [contactData, setContactData] = useState<ContactData | null>(null);

	const reset = () => {
		setStep("capture");
		setSelectedFile(null);
		setImageUrl("");
		setContactData(null);
	};

	const handleImageSelected = (file: File) => {
		setSelectedFile(file);
		setStep("processing");
	};

	const handleProcessingDone = (url: string, data: ContactData) => {
		setImageUrl(url);
		setContactData(data);
		setStep("review");
	};

	const handleProcessingError = (message: string) => {
		toast.error(message || tErrors("ollama_down"));
		reset();
	};

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			<ContactsDrawer />

			{step === "capture" && <CaptureStep onImageSelected={handleImageSelected} />}

			{step === "processing" && selectedFile && (
				<ProcessingStep file={selectedFile} onDone={handleProcessingDone} onError={handleProcessingError} />
			)}

			{step === "review" && contactData && (
				<ReviewStep imageUrl={imageUrl} data={contactData} onSave={reset} onRetry={reset} />
			)}
		</div>
	);
}
```

- [ ] **Step 2: Update app/(app)/app/page.tsx — drop carddavConfig query**

```typescript
import { ScannerWizard } from "@/features/app/scanner/components/scanner-wizard";

export default async function App() {
	return <ScannerWizard />;
}
```

- [ ] **Step 3: Verify full build**

```bash
pnpm check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/app/scanner/components/scanner-wizard.tsx \
        src/features/app/scanner/components/contact-item.tsx \
        src/features/app/scanner/components/contacts-drawer.tsx \
        src/features/app/scanner/components/provider-form.tsx \
        src/features/app/scanner/components/providers-manager.tsx \
        app/\(app\)/app/page.tsx
git commit -m "feat: multi-provider UI — ProviderForm, ProvidersManager, updated ContactItem and Drawer"
```

---

## Task 14: Delete obsolete files

**Files:**
- Delete: `src/lib/carddav.ts`
- Delete: `src/features/app/scanner/actions/save-carddav.action.ts`
- Delete: `src/features/app/scanner/components/carddav-config-form.tsx`

- [ ] **Step 1: Delete the three obsolete files**

```bash
rm src/lib/carddav.ts \
   src/features/app/scanner/actions/save-carddav.action.ts \
   src/features/app/scanner/components/carddav-config-form.tsx
```

- [ ] **Step 2: Final type check**

```bash
pnpm check
```

Expected: no errors. If any errors reference the deleted files, they were missed in earlier tasks — fix the remaining imports.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: remove obsolete carddav.ts, save-carddav action, and carddav-config-form"
```
