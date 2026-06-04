# Contact Book + Sign-out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the floating `ContactsDrawer` button with an inline tab system (Scanner | Contacts) on `/app`, add a persistent header with avatar dropdown + sign-out, and display contacts as a searchable 2-column grid using TanStack Table.

**Architecture:** Single `/app` page with `AppTabs` component managing tab state. Contacts feature and providers feature are extracted into dedicated `src/features/app/contacts/` and `src/features/app/providers/` directories. Header lives in `src/features/app/layouts/`. TanStack Table (headless) drives filtering in `ContactsGrid`, rendering cards not a `<table>`.

**Tech Stack:** Next.js App Router, React 19, TanStack Table v8, TanStack Query v5, better-auth React client, next-intl, Radix UI DropdownMenu, Tailwind CSS, Lucide icons, next-safe-action.

---

### Task 1: Install @tanstack/react-table

**Files:**
- Modify: `package.json` (via pnpm)

- [ ] **Step 1: Install the package**

```bash
pnpm add @tanstack/react-table
```

- [ ] **Step 2: Verify installation**

```bash
grep "@tanstack/react-table" package.json
```

Expected: `"@tanstack/react-table": "^8.x.x"` in dependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @tanstack/react-table"
```

---

### Task 2: Create providers feature — move actions

**Files:**
- Create: `src/features/app/providers/actions/list-providers.action.ts`
- Create: `src/features/app/providers/actions/save-provider.action.ts`
- Create: `src/features/app/providers/actions/delete-provider.action.ts`
- Create: `src/features/app/providers/actions/test-provider-connection.action.ts`

- [ ] **Step 1: Create directory**

```bash
mkdir -p src/features/app/providers/actions
```

- [ ] **Step 2: Create list-providers.action.ts**

Selects all columns except `password` (matches `ProviderSummary` type):

```ts
// src/features/app/providers/actions/list-providers.action.ts
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

- [ ] **Step 3: Create save-provider.action.ts**

```ts
// src/features/app/providers/actions/save-provider.action.ts
"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const saveProvider = anyAuthenticatedAction
	.inputSchema(
		z.object({
			id: z.uuid().optional(),
			type: z.enum(["radicale", "baikal", "nextcloud", "custom"]),
			label: z.string().min(1),
			url: z.string().min(1),
			username: z.string().min(1),
			password: z.string().optional(),
		}),
	)
	.action(async ({ parsedInput: { id, type, label, url, username, password }, ctx: { userId } }) => {
		if (id) {
			const [existing] = await db
				.select({ id: userCardDavProviders.id })
				.from(userCardDavProviders)
				.where(and(eq(userCardDavProviders.id, id), eq(userCardDavProviders.userId, userId)))
				.limit(1);
			if (!existing) throw new Error("Provider introuvable");
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
			.values({ userId, type, label, url, username, password, updatedAt: new Date() })
			.returning({ id: userCardDavProviders.id });
		return { id: row.id };
	});
```

- [ ] **Step 4: Create delete-provider.action.ts**

Nulls out `contacts.providerId` before deleting (prevents orphaned references):

```ts
// src/features/app/providers/actions/delete-provider.action.ts
"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const deleteProvider = anyAuthenticatedAction
	.inputSchema(z.object({ id: z.uuid() }))
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

- [ ] **Step 5: Create test-provider-connection.action.ts**

Note: `provider.testConnection` takes a single credentials object `{ url, username, password }`, not `(url, creds)`:

```ts
// src/features/app/providers/actions/test-provider-connection.action.ts
"use server";

import { z } from "zod";
import { anyAuthenticatedAction } from "@/lib/actions";
import { getProvider } from "@/lib/carddav";

export const testProviderConnection = anyAuthenticatedAction
	.inputSchema(
		z.object({
			type: z.enum(["radicale", "baikal", "nextcloud", "custom"]),
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

- [ ] **Step 6: Commit**

```bash
git add src/features/app/providers/
git commit -m "feat: create providers feature — move actions from scanner"
```

---

### Task 3: Create providers feature — components + translations

**Files:**
- Create: `src/features/app/providers/components/provider-form.tsx`
- Create: `src/features/app/providers/components/providers-manager.tsx`
- Create: `src/features/app/providers/translations/fr.json`
- Create: `src/features/app/providers/translations/en.json`

- [ ] **Step 1: Create directories**

```bash
mkdir -p src/features/app/providers/components src/features/app/providers/translations
```

- [ ] **Step 2: Create providers/translations/fr.json**

```json
{
  "title": "Mes connecteurs",
  "add_btn": "Ajouter un connecteur",
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

- [ ] **Step 3: Create providers/translations/en.json**

```json
{
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

- [ ] **Step 4: Create providers/components/provider-form.tsx**

Same logic as the original — only import paths and translation namespace change:

```tsx
// src/features/app/providers/components/provider-form.tsx
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
	nextcloud: {
		name: "Nextcloud",
		urlPlaceholder: "https://nextcloud.example.com/remote.php/dav/addressbooks/users/username/contacts/",
		urlHint: "Remplacez 'username' par votre identifiant Nextcloud",
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
	const t = useTranslations("providers");
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
				execSave({
					id: initial?.id,
					type: providerType,
					label,
					url,
					username,
					password: password || undefined,
				});
			}}
			className="flex flex-col gap-3"
		>
			<div className="flex flex-col md:flex-row gap-1">
				{(["radicale", "baikal", "nextcloud", "custom"] as ProviderType[]).map((pt) => (
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
				<Input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={meta.name} className="bg-background h-10 px-3 py-2 text-sm" />
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL</label>
				<Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={meta.urlPlaceholder} className="bg-background h-10 px-3 py-2 text-sm" />
				<p className="text-xs text-muted-foreground">{meta.urlHint}</p>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("username")}</label>
				<Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-background h-10 px-3 py-2 text-sm" />
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("password")}</label>
				<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initial ? "••••••••" : ""} className="bg-background h-10 px-3 py-2 text-sm" />
			</div>

			<div className="flex flex-col md:flex-row gap-2 mt-1">
				<Button type="button" variant="outline" size="sm" disabled={!canTest || isTesting} onClick={() => execTest({ type: providerType, url, username, password })}>
					{isTesting ? "…" : t("test_btn")}
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
					{t("cancel_btn")}
				</Button>
				<Button type="submit" size="sm" disabled={!canSave || isSaving}>
					{t("save_btn")}
				</Button>
			</div>
		</form>
	);
}
```

- [ ] **Step 5: Create providers/components/providers-manager.tsx**

```tsx
// src/features/app/providers/components/providers-manager.tsx
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
	const t = useTranslations("providers");
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
					<Button size="icon-xs" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => execDelete({ id: p.id })} title={t("delete")}>
						<Trash2Icon className="size-3.5" />
					</Button>
				</div>
			))}
		</div>
	);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/app/providers/
git commit -m "feat: create providers feature — components and translations"
```

---

### Task 4: Create contacts feature — move actions

**Files:**
- Create: `src/features/app/contacts/actions/list-contacts.action.ts`
- Create: `src/features/app/contacts/actions/save-contact.action.ts`
- Create: `src/features/app/contacts/actions/delete-contact.action.ts`
- Create: `src/features/app/contacts/actions/sync-contact.action.ts`

- [ ] **Step 1: Create directory**

```bash
mkdir -p src/features/app/contacts/actions
```

- [ ] **Step 2: Create list-contacts.action.ts**

```ts
// src/features/app/contacts/actions/list-contacts.action.ts
"use server";

import { desc, eq } from "drizzle-orm";
import { contacts } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

export const listContacts = anyAuthenticatedAction.action(async ({ ctx: { userId } }) => {
	return db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.createdAt));
});
```

- [ ] **Step 3: Create save-contact.action.ts**

```ts
// src/features/app/contacts/actions/save-contact.action.ts
"use server";

import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { contacts } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";

const contactSchema = z.object({
	name: z.string(),
	title: z.string(),
	company: z.string(),
	email: z.string(),
	phone: z.string(),
	website: z.string(),
	address: z.string(),
	imageUrl: z.string().optional(),
});

export const saveContact = anyAuthenticatedAction
	.inputSchema(contactSchema)
	.action(async ({ parsedInput, ctx: { userId } }) => {
		const conditions = [];
		if (parsedInput.email) conditions.push(eq(contacts.email, parsedInput.email));
		if (parsedInput.phone) conditions.push(eq(contacts.phone, parsedInput.phone));
		if (parsedInput.name) conditions.push(eq(contacts.name, parsedInput.name));

		if (conditions.length > 0) {
			const existing = await db
				.select()
				.from(contacts)
				.where(and(eq(contacts.userId, userId), or(...conditions)))
				.limit(1);

			if (existing.length > 0) {
				throw new Error("Un contact avec ces coordonnées existe déjà.");
			}
		}

		const [contact] = await db
			.insert(contacts)
			.values({ userId, ...parsedInput })
			.returning({ id: contacts.id });
		return { id: contact.id };
	});
```

- [ ] **Step 4: Create delete-contact.action.ts**

```ts
// src/features/app/contacts/actions/delete-contact.action.ts
"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { getProvider } from "@/lib/carddav";
import { db } from "@/lib/db";

export const deleteContact = anyAuthenticatedAction
	.inputSchema(z.object({ id: z.number() }))
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

- [ ] **Step 5: Create sync-contact.action.ts**

```ts
// src/features/app/contacts/actions/sync-contact.action.ts
"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { contacts, userCardDavProviders } from "@/db/schemas";
import { anyAuthenticatedAction } from "@/lib/actions";
import { getProvider } from "@/lib/carddav";
import { db } from "@/lib/db";
import { generateVCard } from "@/lib/vcf";

export const syncContact = anyAuthenticatedAction
	.inputSchema(z.object({ id: z.number(), providerId: z.uuid() }))
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

		await db.update(contacts).set({ syncedAt: new Date(), remoteId, providerId }).where(eq(contacts.id, id));
	});
```

- [ ] **Step 6: Commit**

```bash
git add src/features/app/contacts/actions/
git commit -m "feat: create contacts feature — move actions from scanner"
```

---

### Task 5: Create contacts + layouts translations

**Files:**
- Create: `src/features/app/contacts/translations/fr.json`
- Create: `src/features/app/contacts/translations/en.json`
- Create: `src/features/app/layouts/translations/fr.json`
- Create: `src/features/app/layouts/translations/en.json`

- [ ] **Step 1: Create directories**

```bash
mkdir -p src/features/app/contacts/translations src/features/app/layouts/translations
```

- [ ] **Step 2: Create contacts/translations/fr.json**

```json
{
  "grid": {
    "search_placeholder": "Rechercher…",
    "empty": "Aucun contact scanné",
    "no_results": "Aucun résultat pour « {query} »",
    "configure_providers": "Configurer les providers"
  },
  "card": {
    "download_vcf": "Télécharger vCard",
    "sync": "Synchroniser",
    "delete": "Supprimer",
    "synced_label": "Synchronisé"
  },
  "errors": {
    "sync_failed": "Échec de la synchronisation",
    "delete_failed": "Échec de la suppression",
    "no_providers_configured": "Configurez d'abord un provider"
  }
}
```

- [ ] **Step 3: Create contacts/translations/en.json**

```json
{
  "grid": {
    "search_placeholder": "Search…",
    "empty": "No contacts scanned yet",
    "no_results": "No results for \"{query}\"",
    "configure_providers": "Configure providers"
  },
  "card": {
    "download_vcf": "Download vCard",
    "sync": "Sync",
    "delete": "Delete",
    "synced_label": "Synced"
  },
  "errors": {
    "sync_failed": "Sync failed",
    "delete_failed": "Delete failed",
    "no_providers_configured": "Configure a provider first"
  }
}
```

- [ ] **Step 4: Create layouts/translations/fr.json**

```json
{
  "tabs": {
    "scanner": "Scanner",
    "contacts": "Contacts"
  },
  "header": {
    "sign_out": "Se déconnecter"
  }
}
```

- [ ] **Step 5: Create layouts/translations/en.json**

```json
{
  "tabs": {
    "scanner": "Scanner",
    "contacts": "Contacts"
  },
  "header": {
    "sign_out": "Sign out"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/app/contacts/translations/ src/features/app/layouts/translations/
git commit -m "feat: add contacts and layouts translations"
```

---

### Task 6: Update i18n loader + fix review-step import

**Files:**
- Modify: `src/lib/i18n.ts`
- Modify: `src/features/app/scanner/components/steps/review-step.tsx`

- [ ] **Step 1: Update src/lib/i18n.ts**

```ts
// src/lib/i18n.ts
import { getRequestConfig } from "next-intl/server";
import { type AppLocale, routing } from "@/config/i18n";

function isValidLocale(locale: string): locale is AppLocale {
	return routing.locales.includes(locale as AppLocale);
}

export default getRequestConfig(async ({ requestLocale }) => {
	const requestedLocale = await requestLocale;
	const locale = requestedLocale && isValidLocale(requestedLocale) ? requestedLocale : routing.defaultLocale;

	const dirs = ["emails", "auth", "scanner", "contacts", "providers", "app"];

	const pathMap: Record<string, string> = {
		scanner: "app/scanner",
		contacts: "app/contacts",
		providers: "app/providers",
		app: "app/layouts",
	};

	const messages = Object.fromEntries(
		await Promise.all(
			dirs.map(async (dir) => {
				const path = pathMap[dir] ?? dir;
				const mod = await import(`../features/${path}/translations/${locale}.json`);
				return [dir, mod.default];
			}),
		),
	);

	return {
		locale,
		messages,
	};
});
```

- [ ] **Step 2: Update review-step.tsx import for saveContact**

In `src/features/app/scanner/components/steps/review-step.tsx`, change line 10:

```tsx
// Before:
import { saveContact } from "../../actions/save-contact.action";

// After:
import { saveContact } from "@/features/app/contacts/actions/save-contact.action";
```

- [ ] **Step 3: Verify build compiles cleanly**

```bash
pnpm build 2>&1 | tail -20
```

Expected: no import errors for i18n or saveContact.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts src/features/app/scanner/components/steps/review-step.tsx
git commit -m "feat: register contacts/providers/app i18n namespaces, fix review-step import"
```

---

### Task 7: Create contacts/components/contact-card.tsx

**Files:**
- Create: `src/features/app/contacts/components/contact-card.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p src/features/app/contacts/components
```

- [ ] **Step 2: Create contact-card.tsx**

```tsx
// src/features/app/contacts/components/contact-card.tsx
"use client";

import { DownloadIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Contact, ProviderSummary } from "@/db/schemas/contacts";
import { downloadVCard } from "@/lib/vcf";
import { deleteContact } from "../actions/delete-contact.action";
import { syncContact } from "../actions/sync-contact.action";

const AVATAR_COLORS = [
	"bg-violet-500",
	"bg-emerald-500",
	"bg-amber-500",
	"bg-rose-500",
	"bg-sky-500",
	"bg-orange-500",
];

function getAvatarColor(name: string): string {
	const index = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
	return AVATAR_COLORS[index];
}

interface ContactCardProps {
	contact: Contact;
	providers: ProviderSummary[];
	onMutated: () => void;
}

export function ContactCard({ contact, providers, onMutated }: ContactCardProps) {
	const t = useTranslations("contacts.card");
	const tErrors = useTranslations("contacts.errors");
	const tProviders = useTranslations("providers");
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

	const avatarColor = getAvatarColor(contact.name || "?");
	const syncedProvider = providers.find((p) => p.id === contact.providerId);
	const subtitle = contact.company || contact.email || "";

	return (
		<div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-2 text-center">
			<div className={`size-12 rounded-full ${avatarColor} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
				{initials}
			</div>

			<div className="w-full min-w-0">
				<p className="font-semibold text-sm truncate">{contact.name || "—"}</p>
				{subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
				{syncedProvider && (
					<p className="text-xs text-green-600 truncate">
						✓ {t("synced_label")} · {syncedProvider.label}
					</p>
				)}
			</div>

			<div className="flex gap-1">
				<Button size="icon-xs" variant="ghost" onClick={() => downloadVCard(contact)} title={t("download_vcf")}>
					<DownloadIcon className="size-3.5" />
				</Button>
				<Button size="icon-xs" variant="ghost" disabled={isSyncing} onClick={handleSyncClick} title={t("sync")}>
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

			{showPicker && (
				<div className="w-full flex flex-col gap-1 pt-1 border-t border-border">
					<p className="text-xs text-muted-foreground">{tProviders("pick_provider")}</p>
					{providers.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => execSync({ id: contact.id, providerId: p.id })}
							disabled={isSyncing}
							className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors flex items-center justify-between"
						>
							<span>{p.label}</span>
							<span className="text-muted-foreground capitalize">{p.type}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 3: Lint check**

```bash
pnpm lint src/features/app/contacts/components/contact-card.tsx
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/app/contacts/components/contact-card.tsx
git commit -m "feat: add ContactCard component for contacts grid"
```

---

### Task 8: Create contacts/components/contacts-grid.tsx

**Files:**
- Create: `src/features/app/contacts/components/contacts-grid.tsx`

- [ ] **Step 1: Create contacts-grid.tsx**

```tsx
// src/features/app/contacts/components/contacts-grid.tsx
"use client";

import {
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Contact, ProviderSummary } from "@/db/schemas/contacts";
import { listProviders } from "@/features/app/providers/actions/list-providers.action";
import { ProvidersManager } from "@/features/app/providers/components/providers-manager";
import { ContactCard } from "./contact-card";

const columnHelper = createColumnHelper<Contact>();

const columns = [
	columnHelper.accessor("name", {}),
	columnHelper.accessor("company", {}),
	columnHelper.accessor("email", {}),
];

interface ContactsGridProps {
	contacts: Contact[];
	onMutated: () => void;
}

export function ContactsGrid({ contacts, onMutated }: ContactsGridProps) {
	const t = useTranslations("contacts.grid");
	const [globalFilter, setGlobalFilter] = useState("");
	const [showProviders, setShowProviders] = useState(false);

	const { data: providers = [], refetch: refetchProviders } = useQuery({
		queryKey: ["providers"],
		queryFn: async () => {
			const result = await listProviders();
			return (result?.data ?? []) as ProviderSummary[];
		},
	});

	const table = useReactTable({
		data: contacts,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: { globalFilter },
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: "includesString",
	});

	const rows = table.getRowModel().rows;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex gap-2 items-center">
				<Input
					placeholder={t("search_placeholder")}
					value={globalFilter}
					onChange={(e) => setGlobalFilter(e.target.value)}
					className="h-9 text-sm"
				/>
				<Button
					size="icon"
					variant="ghost"
					onClick={() => setShowProviders((v) => !v)}
					title={t("configure_providers")}
					className={showProviders ? "text-primary" : ""}
				>
					<SettingsIcon className="size-4" />
				</Button>
			</div>

			{showProviders && (
				<div className="p-4 rounded-xl bg-muted border border-border">
					<ProvidersManager
						providers={providers}
						onMutated={() => {
							refetchProviders();
							onMutated();
						}}
					/>
				</div>
			)}

			{contacts.length === 0 ? (
				<p className="text-sm text-muted-foreground text-center py-12">{t("empty")}</p>
			) : rows.length === 0 ? (
				<p className="text-sm text-muted-foreground text-center py-12">{t("no_results", { query: globalFilter })}</p>
			) : (
				<div className="grid grid-cols-2 gap-3">
					{rows.map((row) => (
						<ContactCard
							key={row.original.id}
							contact={row.original}
							providers={providers}
							onMutated={() => {
								refetchProviders();
								onMutated();
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Lint check**

```bash
pnpm lint src/features/app/contacts/components/contacts-grid.tsx
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/app/contacts/components/contacts-grid.tsx
git commit -m "feat: add ContactsGrid with TanStack Table filtering"
```

---

### Task 9: Create layouts/app-header.tsx

**Files:**
- Create: `src/features/app/layouts/app-header.tsx`

- [ ] **Step 1: Create app-header.tsx**

```tsx
// src/features/app/layouts/app-header.tsx
"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import authClient from "@/lib/auth/client";

export function AppHeader() {
	const t = useTranslations("app.header");
	const router = useRouter();
	const { data: session } = authClient.useSession();

	const name = session?.user.name ?? "";
	const email = session?.user.email ?? "";
	const initials = name
		? name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: email.slice(0, 2).toUpperCase();

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/portal");
	};

	return (
		<header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
			<span className="text-base font-bold tracking-tight">Kardqntact</span>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{initials}
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					{email && (
						<>
							<DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">{email}</DropdownMenuLabel>
							<DropdownMenuSeparator />
						</>
					)}
					<DropdownMenuItem
						onClick={handleSignOut}
						className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
					>
						{t("sign_out")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</header>
	);
}
```

- [ ] **Step 2: Lint check**

```bash
pnpm lint src/features/app/layouts/app-header.tsx
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/app/layouts/app-header.tsx
git commit -m "feat: add AppHeader with avatar dropdown and sign-out"
```

---

### Task 10: Create layouts/app-tabs.tsx

**Files:**
- Create: `src/features/app/layouts/app-tabs.tsx`

- [ ] **Step 1: Create app-tabs.tsx**

```tsx
// src/features/app/layouts/app-tabs.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Contact } from "@/db/schemas/contacts";
import { listContacts } from "@/features/app/contacts/actions/list-contacts.action";
import { ContactsGrid } from "@/features/app/contacts/components/contacts-grid";
import { ScannerWizard } from "@/features/app/scanner/components/scanner-wizard";
import { AppHeader } from "./app-header";

type Tab = "scanner" | "contacts";

export function AppTabs() {
	const t = useTranslations("app.tabs");
	const [activeTab, setActiveTab] = useState<Tab>("scanner");

	const { data: contacts = [], refetch: refetchContacts } = useQuery({
		queryKey: ["contacts"],
		queryFn: async () => {
			const result = await listContacts();
			return (result?.data ?? []) as Contact[];
		},
	});

	return (
		<div className="flex flex-col min-h-screen bg-background">
			<AppHeader />

			<div className="sticky top-[57px] z-40 bg-background border-b border-border px-4 py-2">
				<div className="flex gap-2 max-w-420 mx-auto">
					<button
						type="button"
						onClick={() => setActiveTab("scanner")}
						className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === "scanner"
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:text-foreground"
						}`}
					>
						{t("scanner")}
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("contacts")}
						className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === "contacts"
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:text-foreground"
						}`}
					>
						{t("contacts")}
						{contacts.length > 0 && (
							<span
								className={`absolute -top-1.5 -right-1.5 size-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
									activeTab === "contacts"
										? "bg-background text-primary"
										: "bg-primary text-primary-foreground"
								}`}
							>
								{contacts.length > 99 ? "99+" : contacts.length}
							</span>
						)}
					</button>
				</div>
			</div>

			<main className="flex-1 w-full max-w-420 mx-auto p-4">
				{activeTab === "scanner" && <ScannerWizard />}
				{activeTab === "contacts" && (
					<ContactsGrid contacts={contacts} onMutated={refetchContacts} />
				)}
			</main>
		</div>
	);
}
```

- [ ] **Step 2: Lint check**

```bash
pnpm lint src/features/app/layouts/app-tabs.tsx
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/app/layouts/app-tabs.tsx
git commit -m "feat: add AppTabs — scanner/contacts tab toggle with badge"
```

---

### Task 11: Wire up page + clean scanner

**Files:**
- Modify: `app/(app)/app/page.tsx`
- Modify: `src/features/app/layouts/dashboard.tsx`
- Modify: `src/features/app/scanner/components/scanner-wizard.tsx`
- Modify: `src/features/app/scanner/translations/fr.json`
- Modify: `src/features/app/scanner/translations/en.json`

- [ ] **Step 1: Update app/(app)/app/page.tsx**

```tsx
// app/(app)/app/page.tsx
import { AppTabs } from "@/features/app/layouts/app-tabs";

export default async function App() {
	return <AppTabs />;
}
```

- [ ] **Step 2: Update dashboard.tsx — AppTabs handles its own layout**

The `Dashboard` layout wrapper adds a `main` with `max-w-420` — but `AppTabs` now manages its own layout. Keep `Dashboard` minimal so it doesn't double-wrap:

```tsx
// src/features/app/layouts/dashboard.tsx
"use client";

export function Dashboard({ children }: { children: React.ReactNode }) {
	return <div className="min-h-screen bg-background">{children}</div>;
}
```

- [ ] **Step 3: Remove ContactsDrawer from scanner-wizard.tsx**

Remove the `ContactsDrawer` import and its JSX usage. Full updated file:

```tsx
// src/features/app/scanner/components/scanner-wizard.tsx
"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import type { ContactData } from "@/lib/types";
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
		<div>
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

- [ ] **Step 4: Trim scanner/translations/fr.json — remove moved keys**

```json
{
  "capture": {
    "title": "Scanner une carte",
    "camera_btn": "Caméra",
    "gallery_btn": "Galerie",
    "analyze_btn": "Analyser",
    "camera_request": "Autoriser la caméra",
    "camera_denied": "Caméra refusée — utilisez la galerie",
    "capture_btn": "Capturer",
    "retake_btn": "Reprendre",
    "preview_alt": "Aperçu de la carte de visite"
  },
  "processing": {
    "title": "Analyse en cours…",
    "subtitle": "Le modèle extrait les informations"
  },
  "review": {
    "title": "Vérifier les informations",
    "name": "Nom",
    "title_field": "Poste",
    "company": "Société",
    "email": "Email",
    "phone": "Téléphone",
    "website": "Site web",
    "address": "Adresse",
    "save_btn": "Sauvegarder",
    "retry_btn": "Recommencer",
    "saved_toast": "Contact sauvegardé"
  },
  "errors": {
    "ollama_down": "Ollama indisponible — vérifiez qu'il tourne"
  }
}
```

- [ ] **Step 5: Trim scanner/translations/en.json**

```json
{
  "capture": {
    "title": "Scan a card",
    "camera_btn": "Camera",
    "gallery_btn": "Gallery",
    "analyze_btn": "Analyze",
    "camera_request": "Allow camera",
    "camera_denied": "Camera denied — use gallery",
    "capture_btn": "Capture",
    "retake_btn": "Retake",
    "preview_alt": "Business card preview"
  },
  "processing": {
    "title": "Analyzing…",
    "subtitle": "The model is extracting information"
  },
  "review": {
    "title": "Review information",
    "name": "Name",
    "title_field": "Job title",
    "company": "Company",
    "email": "Email",
    "phone": "Phone",
    "website": "Website",
    "address": "Address",
    "save_btn": "Save",
    "retry_btn": "Try again",
    "saved_toast": "Contact saved"
  },
  "errors": {
    "ollama_down": "Ollama unavailable — check it's running"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add app/(app)/app/page.tsx \
        src/features/app/layouts/dashboard.tsx \
        src/features/app/scanner/components/scanner-wizard.tsx \
        src/features/app/scanner/translations/
git commit -m "feat: wire AppTabs to /app, remove ContactsDrawer from scanner"
```

---

### Task 12: Delete old scanner files + final build

**Files:**
- Delete: `src/features/app/scanner/components/contacts-drawer.tsx`
- Delete: `src/features/app/scanner/components/contact-item.tsx`
- Delete: `src/features/app/scanner/actions/list-contacts.action.ts`
- Delete: `src/features/app/scanner/actions/save-contact.action.ts`
- Delete: `src/features/app/scanner/actions/delete-contact.action.ts`
- Delete: `src/features/app/scanner/actions/sync-contact.action.ts`
- Delete: `src/features/app/scanner/actions/list-providers.action.ts`
- Delete: `src/features/app/scanner/actions/save-provider.action.ts`
- Delete: `src/features/app/scanner/actions/delete-provider.action.ts`
- Delete: `src/features/app/scanner/actions/test-provider-connection.action.ts`

- [ ] **Step 1: Delete obsolete files**

```bash
rm src/features/app/scanner/components/contacts-drawer.tsx
rm src/features/app/scanner/components/contact-item.tsx
rm src/features/app/scanner/actions/list-contacts.action.ts
rm src/features/app/scanner/actions/save-contact.action.ts
rm src/features/app/scanner/actions/delete-contact.action.ts
rm src/features/app/scanner/actions/sync-contact.action.ts
rm src/features/app/scanner/actions/list-providers.action.ts
rm src/features/app/scanner/actions/save-provider.action.ts
rm src/features/app/scanner/actions/delete-provider.action.ts
rm src/features/app/scanner/actions/test-provider-connection.action.ts
```

- [ ] **Step 2: Run full build**

```bash
pnpm build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: delete obsolete scanner components and actions (moved to contacts/providers features)"
```
