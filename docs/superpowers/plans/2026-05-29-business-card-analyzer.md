# Business Card Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a mobile-first guided wizard that scans business card images via camera/gallery, extracts contact data using a local Ollama model, stores them in PostgreSQL, and allows vCard download or sync to a per-user Radicale CardDAV server.

**Architecture:** Single-page wizard at `/app` with 3 steps (capture → processing → review) managed by local React state. Contacts accessible via a bottom drawer (vaul) with a fixed FAB. All data operations use `anyAuthenticatedAction` (next-safe-action) backed by Drizzle ORM.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM (PostgreSQL), next-safe-action, TanStack Query, vaul (Drawer), Tailwind CSS 4, Ollama (local vision model), Zod 4

---

## File Map

**Create:**
- `src/lib/types.ts` — ContactData, AddressBook, emptyContact
- `src/features/app/scanner/actions/analyze-card.action.ts`
- `src/features/app/scanner/actions/save-contact.action.ts`
- `src/features/app/scanner/actions/list-contacts.action.ts`
- `src/features/app/scanner/actions/delete-contact.action.ts`
- `src/features/app/scanner/actions/save-carddav.action.ts`
- `src/features/app/scanner/actions/sync-contact.action.ts`
- `src/features/app/scanner/components/steps/capture-step.tsx`
- `src/features/app/scanner/components/steps/processing-step.tsx`
- `src/features/app/scanner/components/steps/review-step.tsx`
- `src/features/app/scanner/components/contact-item.tsx`
- `src/features/app/scanner/components/carddav-config-form.tsx`
- `src/features/app/scanner/components/contacts-drawer.tsx`
- `src/features/app/scanner/components/scanner-wizard.tsx`
- `src/features/app/scanner/translations/fr.json`
- `src/features/app/scanner/translations/en.json`

**Modify:**
- `src/lib/types.ts` — (new file replacing missing import)
- `src/lib/actions.ts` — add `anyAuthenticatedAction`
- `src/lib/carddav.ts` — `saveContact()` accepts credentials param, remove env dependency
- `db/schemas/contacts.ts` — add contacts + user_carddav_config tables
- `env.ts` — add OLLAMA_BASE_URL, OLLAMA_MODEL
- `.env.example` — add OLLAMA vars
- `src/lib/i18n.ts` — add "scanner" to dirs + pathMap
- `app/(app)/app/page.tsx` — render ScannerWizard
- `next.config.ts` — add Permissions-Policy header

---

## Task 1: Create `src/lib/types.ts`

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/lib/types.ts
export interface ContactData {
	name: string;
	title: string;
	company: string;
	email: string;
	phone: string;
	website: string;
	address: string;
}

export function emptyContact(): ContactData {
	return { name: "", title: "", company: "", email: "", phone: "", website: "", address: "" };
}

export interface AddressBook {
	href: string;
	name: string;
}
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
pnpm check
```

Expected: no errors referencing `./types` in ollama.ts, vcf.ts, or carddav.ts

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared ContactData and AddressBook types"
```

---

## Task 2: Add `anyAuthenticatedAction` to `src/lib/actions.ts`

**Context:** The existing `authentificatedAction` only allows `role === "user"`. The first account created is `admin` — this action client accepts any authenticated session regardless of role.

**Files:**
- Modify: `src/lib/actions.ts`

- [ ] **Step 1: Add the new action client**

Open `src/lib/actions.ts`. The file currently ends after `authentificatedAction`. Append:

```typescript
export const anyAuthenticatedAction = action.use(async ({ next }) => {
	const session = await authServer.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		throw new Error("Unauthorized.");
	}

	return next({
		ctx: {
			userId: session.user.id,
			user: session.user,
		},
	});
});
```

- [ ] **Step 2: Verify**

```bash
pnpm check
```

Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions.ts
git commit -m "feat: add anyAuthenticatedAction for role-agnostic auth"
```

---

## Task 3: Refactor `src/lib/carddav.ts` to accept credentials as parameter

**Context:** CardDAV config is now per-user in the DB, not global env vars. `saveContact` must accept credentials directly. `discoverBooks` is out of scope but also needs updating to avoid build errors.

**Files:**
- Modify: `src/lib/carddav.ts`

- [ ] **Step 1: Replace the file content**

```typescript
// src/lib/carddav.ts
import type { AddressBook } from "./types";

function basicAuth(username: string, password: string): string {
	return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function parseAddressBooks(xml: string): AddressBook[] {
	const books: AddressBook[] = [];
	const responsePattern =
		/<(?:\w+:)?response\b[^>]*>([\s\S]*?)<\/(?:\w+:)?response>/gi;
	let match = responsePattern.exec(xml);
	while (match !== null) {
		const block = match[1];
		const resourcetypeMatch =
			/<(?:\w+:)?resourcetype\b[^>]*>([\s\S]*?)<\/(?:\w+:)?resourcetype>/i.exec(
				block,
			);
		if (resourcetypeMatch && /addressbook/i.test(resourcetypeMatch[1])) {
			const hrefMatch = /<(?:\w+:)?href\b[^>]*>([^<]+)<\/(?:\w+:)?href>/i.exec(
				block,
			);
			const nameMatch =
				/<(?:\w+:)?displayname\b[^>]*>([^<]*)<\/(?:\w+:)?displayname>/i.exec(
					block,
				);
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

export async function discoverBooks(credentials: {
	url: string;
	username: string;
	password: string;
}): Promise<AddressBook[]> {
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
	credentials: { url: string; username: string; password: string },
): Promise<void> {
	const { url, username, password } = credentials;
	const uid = crypto.randomUUID();
	const bookBase = bookHref.startsWith("http")
		? bookHref.replace(/\/?$/, "/")
		: `${new URL(url).origin}${bookHref.replace(/\/?$/, "/")}`;
	const contactUrl = `${bookBase}${uid}.vcf`;
	const vcardWithUid = vcardString.replace(
		/\r?\nEND:VCARD/,
		`\r\nUID:${uid}\r\nEND:VCARD`,
	);
	const res = await fetch(contactUrl, {
		method: "PUT",
		headers: {
			Authorization: basicAuth(username, password),
			"Content-Type": "text/vcard; charset=utf-8",
		},
		body: vcardWithUid,
	});
	if (!res.ok) throw new Error(`PUT failed: ${res.status} ${res.statusText}`);
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/carddav.ts
git commit -m "refactor: carddav saveContact accepts credentials param instead of env"
```

---

## Task 4: Add Ollama env vars + DB schema

**Files:**
- Modify: `env.ts`
- Modify: `.env.example`
- Modify: `db/schemas/contacts.ts`

- [ ] **Step 1: Add Ollama vars to `env.ts`**

In `env.ts`, inside the `server:` block, add after `APP_LOCALE`:

```typescript
OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
OLLAMA_MODEL: z.string().default("llama3.2-vision"),
```

In the `runtimeEnv:` block, add:

```typescript
OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
OLLAMA_MODEL: process.env.OLLAMA_MODEL,
```

- [ ] **Step 2: Update `.env.example`**

Append to `.env.example`:

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llava
```

- [ ] **Step 3: Fill in `db/schemas/contacts.ts`**

```typescript
// db/schemas/contacts.ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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
	syncedAt: timestamp("synced_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userCarddavConfig = pgTable("user_carddav_config", {
	userId: text("user_id").primaryKey(),
	url: text("url").notNull(),
	username: text("username").notNull(),
	password: text("password").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type UserCarddavConfig = typeof userCarddavConfig.$inferSelect;
```

- [ ] **Step 4: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add env.ts .env.example db/schemas/contacts.ts
git commit -m "feat: add Ollama env vars and contacts DB schema"
```

---

## Task 5: Generate and apply DB migration

**Context:** Docker + PostgreSQL must be running. Run `just up` first if not already running.

**Files:**
- Create: `db/migrations/<timestamp>_contacts.sql` (auto-generated)

- [ ] **Step 1: Ensure Docker is running**

```bash
just up
```

Wait for Postgres to be ready (check `docker ps`).

- [ ] **Step 2: Generate migration**

```bash
pnpm db:generate
```

Expected: new file created in `db/migrations/` with CREATE TABLE statements for `contacts` and `user_carddav_config`

- [ ] **Step 3: Apply migration**

```bash
pnpm db:migrate
```

Expected: "Migration applied" or similar success output — no errors

- [ ] **Step 4: Commit**

```bash
git add db/migrations/
git commit -m "feat: add contacts and user_carddav_config migrations"
```

---

## Task 6: Server actions — analyze, save, list, delete contacts

**Files:**
- Create: `src/features/app/scanner/actions/analyze-card.action.ts`
- Create: `src/features/app/scanner/actions/save-contact.action.ts`
- Create: `src/features/app/scanner/actions/list-contacts.action.ts`
- Create: `src/features/app/scanner/actions/delete-contact.action.ts`

- [ ] **Step 1: Create `analyze-card.action.ts`**

```typescript
// src/features/app/scanner/actions/analyze-card.action.ts
"use server";

import { z } from "zod";
import { anyAuthenticatedAction } from "@/lib/actions";
import { parseCardImage } from "@/lib/ollama";

export const analyzeCard = anyAuthenticatedAction
	.schema(z.object({ imageBase64: z.string().min(1) }))
	.action(async ({ parsedInput: { imageBase64 } }) => {
		return parseCardImage(imageBase64);
	});
```

- [ ] **Step 2: Create `save-contact.action.ts`**

```typescript
// src/features/app/scanner/actions/save-contact.action.ts
"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { contacts } from "@/db/schemas";

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
	.schema(contactSchema)
	.action(async ({ parsedInput, ctx: { userId } }) => {
		const [contact] = await db
			.insert(contacts)
			.values({ userId, ...parsedInput })
			.returning({ id: contacts.id });
		return { id: contact.id };
	});
```

- [ ] **Step 3: Create `list-contacts.action.ts`**

```typescript
// src/features/app/scanner/actions/list-contacts.action.ts
"use server";

import { desc, eq } from "drizzle-orm";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { contacts } from "@/db/schemas";

export const listContacts = anyAuthenticatedAction.action(async ({ ctx: { userId } }) => {
	return db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(desc(contacts.createdAt));
});
```

- [ ] **Step 4: Create `delete-contact.action.ts`**

```typescript
// src/features/app/scanner/actions/delete-contact.action.ts
"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { contacts } from "@/db/schemas";

export const deleteContact = anyAuthenticatedAction
	.schema(z.object({ id: z.number() }))
	.action(async ({ parsedInput: { id }, ctx: { userId } }) => {
		await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
	});
```

- [ ] **Step 5: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/features/app/scanner/actions/
git commit -m "feat: add analyze, save, list, delete contact server actions"
```

---

## Task 7: Server actions — CardDAV config and sync

**Files:**
- Create: `src/features/app/scanner/actions/save-carddav.action.ts`
- Create: `src/features/app/scanner/actions/sync-contact.action.ts`

- [ ] **Step 1: Create `save-carddav.action.ts`**

```typescript
// src/features/app/scanner/actions/save-carddav.action.ts
"use server";

import { z } from "zod";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { userCarddavConfig } from "@/db/schemas";

export const saveCarddavConfig = anyAuthenticatedAction
	.schema(
		z.object({
			url: z.string().min(1),
			username: z.string().min(1),
			password: z.string().min(1),
		}),
	)
	.action(async ({ parsedInput, ctx: { userId } }) => {
		await db
			.insert(userCarddavConfig)
			.values({ userId, ...parsedInput })
			.onConflictDoUpdate({
				target: userCarddavConfig.userId,
				set: { ...parsedInput, updatedAt: new Date() },
			});
	});
```

- [ ] **Step 2: Create `sync-contact.action.ts`**

```typescript
// src/features/app/scanner/actions/sync-contact.action.ts
"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { anyAuthenticatedAction } from "@/lib/actions";
import { db } from "@/lib/db";
import { contacts, userCarddavConfig } from "@/db/schemas";
import { generateVCard } from "@/lib/vcf";
import { saveContact as cardDavSaveContact } from "@/lib/carddav";

export const syncContact = anyAuthenticatedAction
	.schema(z.object({ id: z.number() }))
	.action(async ({ parsedInput: { id }, ctx: { userId } }) => {
		const [config] = await db
			.select()
			.from(userCarddavConfig)
			.where(eq(userCarddavConfig.userId, userId));
		if (!config) throw new Error("CardDAV non configuré");

		const [contact] = await db
			.select()
			.from(contacts)
			.where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
		if (!contact) throw new Error("Contact introuvable");

		const vcard = generateVCard(contact);
		await cardDavSaveContact(vcard, config.url, {
			url: config.url,
			username: config.username,
			password: config.password,
		});

		await db.update(contacts).set({ syncedAt: new Date() }).where(eq(contacts.id, id));
	});
```

- [ ] **Step 3: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/features/app/scanner/actions/
git commit -m "feat: add CardDAV config and sync server actions"
```

---

## Task 8: i18n translations

**Files:**
- Create: `src/features/app/scanner/translations/fr.json`
- Create: `src/features/app/scanner/translations/en.json`
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Create French translations**

```json
{
  "capture": {
    "title": "Scanner une carte",
    "camera_btn": "Caméra",
    "gallery_btn": "Galerie",
    "analyze_btn": "Analyser",
    "camera_request": "Autoriser la caméra",
    "camera_denied": "Caméra refusée — utilisez la galerie",
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
  "drawer": {
    "title": "Mes contacts",
    "empty": "Aucun contact scanné",
    "download_vcf": "Télécharger vCard",
    "sync_radicale": "Sync Radicale",
    "delete": "Supprimer",
    "synced_label": "Synchronisé",
    "configure_carddav": "Configurer Radicale",
    "carddav_not_configured": "CardDAV non configuré"
  },
  "carddav": {
    "title": "Serveur Radicale",
    "url": "URL du serveur",
    "url_placeholder": "http://radicale:5232/user/contacts/",
    "username": "Identifiant",
    "password": "Mot de passe",
    "save_btn": "Enregistrer",
    "saved_toast": "Configuration sauvegardée"
  },
  "errors": {
    "ollama_down": "Ollama indisponible — vérifiez qu'il tourne",
    "sync_failed": "Échec de la synchronisation",
    "delete_failed": "Échec de la suppression",
    "carddav_not_configured": "Configurez d'abord votre serveur Radicale"
  }
}
```

- [ ] **Step 2: Create English translations**

```json
{
  "capture": {
    "title": "Scan a card",
    "camera_btn": "Camera",
    "gallery_btn": "Gallery",
    "analyze_btn": "Analyze",
    "camera_request": "Allow camera",
    "camera_denied": "Camera denied — use gallery",
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
  "drawer": {
    "title": "My contacts",
    "empty": "No contacts scanned yet",
    "download_vcf": "Download vCard",
    "sync_radicale": "Sync Radicale",
    "delete": "Delete",
    "synced_label": "Synced",
    "configure_carddav": "Configure Radicale",
    "carddav_not_configured": "CardDAV not configured"
  },
  "carddav": {
    "title": "Radicale server",
    "url": "Server URL",
    "url_placeholder": "http://radicale:5232/user/contacts/",
    "username": "Username",
    "password": "Password",
    "save_btn": "Save",
    "saved_toast": "Configuration saved"
  },
  "errors": {
    "ollama_down": "Ollama unavailable — check it's running",
    "sync_failed": "Sync failed",
    "delete_failed": "Delete failed",
    "carddav_not_configured": "Configure your Radicale server first"
  }
}
```

- [ ] **Step 3: Register translations in `src/lib/i18n.ts`**

In `src/lib/i18n.ts`, find the `dirs` array and add `"scanner"`. Find the `pathMap` object and add the scanner path.

The `dirs` array currently is:
```typescript
const dirs = [
  "common",
  "landing",
  "emails",
  "cookie",
  "legal",
  "auth",
  "app",
  "membership-application",
  "membership",
  "admin",
];
```

Change to:
```typescript
const dirs = [
  "common",
  "landing",
  "emails",
  "cookie",
  "legal",
  "auth",
  "app",
  "scanner",
  "membership-application",
  "membership",
  "admin",
];
```

The `pathMap` object currently is:
```typescript
const pathMap: Record<string, string> = {
  "membership-application": "app/membership-application",
  membership: "app/membership",
  admin: "app/admin",
};
```

Change to:
```typescript
const pathMap: Record<string, string> = {
  scanner: "app/scanner",
  "membership-application": "app/membership-application",
  membership: "app/membership",
  admin: "app/admin",
};
```

- [ ] **Step 4: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/features/app/scanner/translations/ src/lib/i18n.ts
git commit -m "feat: add scanner i18n translations (fr/en)"
```

---

## Task 9: UI — CaptureStep

**Files:**
- Create: `src/features/app/scanner/components/steps/capture-step.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/features/app/scanner/components/steps/capture-step.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CaptureStepProps {
	onImageSelected: (file: File) => void;
}

type CameraPermission = "pending" | "granted" | "denied";

export function CaptureStep({ onImageSelected }: CaptureStepProps) {
	const t = useTranslations("scanner.capture");
	const [permission, setPermission] = useState<CameraPermission>("pending");
	const [preview, setPreview] = useState<string | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const cameraInputRef = useRef<HTMLInputElement>(null);
	const galleryInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!navigator.permissions) return;
		navigator.permissions
			.query({ name: "camera" as PermissionName })
			.then((status) => {
				setPermission(status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "pending");
				status.onchange = () => {
					setPermission(status.state === "granted" ? "granted" : status.state === "denied" ? "denied" : "pending");
				};
			})
			.catch(() => setPermission("pending"));
	}, []);

	const requestCamera = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			stream.getTracks().forEach((t) => t.stop());
			setPermission("granted");
			cameraInputRef.current?.click();
		} catch {
			setPermission("denied");
		}
	};

	const handleFile = (file: File) => {
		setSelectedFile(file);
		const url = URL.createObjectURL(file);
		setPreview(url);
	};

	const handleCameraClick = () => {
		if (permission === "granted") {
			cameraInputRef.current?.click();
		} else {
			requestCamera();
		}
	};

	return (
		<div className="flex flex-col items-center gap-6 py-8 px-4">
			<h1 className="text-2xl font-black tracking-tight">{t("title")}</h1>

			{preview ? (
				<div className="w-full max-w-sm rounded-2xl overflow-hidden border border-zinc-200 shadow-sm">
					<img src={preview} alt={t("preview_alt")} className="w-full object-contain max-h-64" />
				</div>
			) : (
				<div className="w-full max-w-sm h-48 rounded-2xl border-2 border-dashed border-zinc-300 flex items-center justify-center bg-zinc-50">
					<ImageIcon className="size-12 text-zinc-300" />
				</div>
			)}

			<div className="flex gap-3 w-full max-w-sm">
				<Button
					variant="outline"
					className="flex-1 gap-2"
					onClick={handleCameraClick}
					disabled={permission === "denied"}
				>
					<CameraIcon className="size-4" />
					{permission === "denied" ? t("camera_denied") : permission === "pending" ? t("camera_request") : t("camera_btn")}
				</Button>
				<Button variant="outline" className="flex-1 gap-2" onClick={() => galleryInputRef.current?.click()}>
					<ImageIcon className="size-4" />
					{t("gallery_btn")}
				</Button>
			</div>

			<Button
				className="w-full max-w-sm"
				disabled={!selectedFile}
				onClick={() => selectedFile && onImageSelected(selectedFile)}
			>
				{t("analyze_btn")}
			</Button>

			<input
				ref={cameraInputRef}
				type="file"
				accept="image/*"
				capture="environment"
				className="hidden"
				onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
			/>
			<input
				ref={galleryInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
			/>
		</div>
	);
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/app/scanner/components/steps/capture-step.tsx
git commit -m "feat: add CaptureStep with camera permission handling"
```

---

## Task 10: UI — ProcessingStep

**Files:**
- Create: `src/features/app/scanner/components/steps/processing-step.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/features/app/scanner/components/steps/processing-step.tsx
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { analyzeCard } from "../actions/analyze-card.action";
import type { ContactData } from "@/lib/types";

interface ProcessingStepProps {
	file: File;
	onDone: (imageUrl: string, data: ContactData) => void;
	onError: (message: string) => void;
}

async function uploadFile(file: File): Promise<string> {
	const formData = new FormData();
	formData.append("file", file);
	const res = await fetch("/api/uploads", { method: "POST", body: formData });
	if (!res.ok) throw new Error("Upload échoué");
	const json = await res.json();
	return json.url as string;
}

async function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve((reader.result as string).split(",")[1]);
		reader.onerror = reject;
	});
}

export function ProcessingStep({ file, onDone, onError }: ProcessingStepProps) {
	const t = useTranslations("scanner.processing");
	const tErrors = useTranslations("scanner.errors");
	const { executeAsync } = useAction(analyzeCard);

	useEffect(() => {
		let cancelled = false;
		async function run() {
			try {
				const [imageUrl, imageBase64] = await Promise.all([uploadFile(file), fileToBase64(file)]);
				if (cancelled) return;
				const result = await executeAsync({ imageBase64 });
				if (cancelled) return;
				if (result?.serverError) {
					onError(result.serverError);
					return;
				}
				if (result?.data) {
					onDone(imageUrl, result.data);
				}
			} catch (e) {
				if (!cancelled) onError(e instanceof Error ? e.message : tErrors("ollama_down"));
			}
		}
		run();
		return () => {
			cancelled = true;
		};
	}, [file]);

	return (
		<div className="flex flex-col items-center justify-center gap-4 py-24 px-4">
			<div className="size-12 rounded-full border-4 border-zinc-200 border-t-zinc-800 animate-spin" />
			<h2 className="text-lg font-semibold">{t("title")}</h2>
			<p className="text-sm text-muted-foreground">{t("subtitle")}</p>
		</div>
	);
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/app/scanner/components/steps/processing-step.tsx
git commit -m "feat: add ProcessingStep with upload + Ollama analysis"
```

---

## Task 11: UI — ReviewStep

**Files:**
- Create: `src/features/app/scanner/components/steps/review-step.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/features/app/scanner/components/steps/review-step.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveContact } from "../actions/save-contact.action";
import type { ContactData } from "@/lib/types";

interface ReviewStepProps {
	imageUrl: string;
	data: ContactData;
	onSave: () => void;
	onRetry: () => void;
}

const FIELDS = [
	{ key: "name", translationKey: "name" },
	{ key: "title", translationKey: "title_field" },
	{ key: "company", translationKey: "company" },
	{ key: "email", translationKey: "email" },
	{ key: "phone", translationKey: "phone" },
	{ key: "website", translationKey: "website" },
	{ key: "address", translationKey: "address" },
] as const;

export function ReviewStep({ imageUrl, data, onSave, onRetry }: ReviewStepProps) {
	const t = useTranslations("scanner.review");
	const [formData, setFormData] = useState<ContactData>(data);
	const { execute, isPending } = useAction(saveContact, {
		onSuccess: () => {
			toast.success(t("saved_toast"));
			onSave();
		},
		onError: ({ error }) => {
			toast.error(error.serverError ?? "Erreur lors de la sauvegarde");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		execute({ ...formData, imageUrl });
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4 py-6 px-4">
			<h1 className="text-2xl font-black tracking-tight">{t("title")}</h1>

			{imageUrl && (
				<div className="w-24 h-16 rounded-lg overflow-hidden border border-zinc-200 self-center">
					<img src={imageUrl} alt="carte" className="w-full h-full object-cover" />
				</div>
			)}

			<div className="flex flex-col gap-3">
				{FIELDS.map(({ key, translationKey }) => (
					<div key={key} className="flex flex-col gap-1">
						<label htmlFor={key} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{t(translationKey)}
						</label>
						<input
							id={key}
							type="text"
							value={formData[key]}
							onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
							className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
						/>
					</div>
				))}
			</div>

			<div className="flex gap-3 mt-2">
				<Button type="button" variant="outline" className="flex-1" onClick={onRetry}>
					{t("retry_btn")}
				</Button>
				<Button type="submit" className="flex-1" disabled={isPending}>
					{t("save_btn")}
				</Button>
			</div>
		</form>
	);
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/app/scanner/components/steps/review-step.tsx
git commit -m "feat: add ReviewStep with editable contact form"
```

---

## Task 12: UI — ContactItem + CarddavConfigForm

**Files:**
- Create: `src/features/app/scanner/components/contact-item.tsx`
- Create: `src/features/app/scanner/components/carddav-config-form.tsx`

- [ ] **Step 1: Create `contact-item.tsx`**

```typescript
// src/features/app/scanner/components/contact-item.tsx
"use client";

import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { DownloadIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadVCard } from "@/lib/vcf";
import { deleteContact } from "../actions/delete-contact.action";
import { syncContact } from "../actions/sync-contact.action";
import type { Contact } from "@/db/schemas/contacts";

interface ContactItemProps {
	contact: Contact;
	carddavConfigured: boolean;
	onMutated: () => void;
}

export function ContactItem({ contact, carddavConfigured, onMutated }: ContactItemProps) {
	const t = useTranslations("scanner.drawer");
	const tErrors = useTranslations("scanner.errors");

	const { execute: execDelete, isPending: isDeleting } = useAction(deleteContact, {
		onSuccess: onMutated,
		onError: () => toast.error(tErrors("delete_failed")),
	});

	const { execute: execSync, isPending: isSyncing } = useAction(syncContact, {
		onSuccess: () => {
			toast.success(t("synced_label"));
			onMutated();
		},
		onError: ({ error }) => toast.error(error.serverError ?? tErrors("sync_failed")),
	});

	const initials = contact.name
		? contact.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
		: "?";

	return (
		<div className="flex items-center gap-3 py-3 border-b border-zinc-100 last:border-0">
			<div className="size-10 rounded-full bg-zinc-800 text-white flex items-center justify-center text-sm font-bold shrink-0">
				{initials}
			</div>
			<div className="flex-1 min-w-0">
				<p className="font-medium text-sm truncate">{contact.name || "—"}</p>
				<p className="text-xs text-muted-foreground truncate">{contact.company || contact.email || ""}</p>
				{contact.syncedAt && (
					<p className="text-xs text-green-600">{t("synced_label")}</p>
				)}
			</div>
			<div className="flex gap-1 shrink-0">
				<Button
					size="icon-xs"
					variant="ghost"
					onClick={() => downloadVCard(contact)}
					title={t("download_vcf")}
				>
					<DownloadIcon className="size-3.5" />
				</Button>
				<Button
					size="icon-xs"
					variant="ghost"
					disabled={!carddavConfigured || isSyncing}
					onClick={() => execSync({ id: contact.id })}
					title={carddavConfigured ? t("sync_radicale") : tErrors("carddav_not_configured")}
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
	);
}
```

- [ ] **Step 2: Create `carddav-config-form.tsx`**

```typescript
// src/features/app/scanner/components/carddav-config-form.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveCarddavConfig } from "../actions/save-carddav.action";
import type { UserCarddavConfig } from "@/db/schemas/contacts";

interface CarddavConfigFormProps {
	initial?: UserCarddavConfig | null;
	onSaved: () => void;
}

export function CarddavConfigForm({ initial, onSaved }: CarddavConfigFormProps) {
	const t = useTranslations("scanner.carddav");
	const [url, setUrl] = useState(initial?.url ?? "");
	const [username, setUsername] = useState(initial?.username ?? "");
	const [password, setPassword] = useState(initial?.password ?? "");

	const { execute, isPending } = useAction(saveCarddavConfig, {
		onSuccess: () => {
			toast.success(t("saved_toast"));
			onSaved();
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				execute({ url, username, password });
			}}
			className="flex flex-col gap-3 pt-2"
		>
			<p className="text-sm font-semibold">{t("title")}</p>
			{(
				[
					{ label: t("url"), value: url, set: setUrl, type: "url", placeholder: t("url_placeholder") },
					{ label: t("username"), value: username, set: setUsername, type: "text", placeholder: "" },
					{ label: t("password"), value: password, set: setPassword, type: "password", placeholder: "" },
				] as const
			).map(({ label, value, set, type, placeholder }) => (
				<div key={label} className="flex flex-col gap-1">
					<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
					<input
						type={type}
						value={value}
						onChange={(e) => set(e.target.value)}
						placeholder={placeholder}
						className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
					/>
				</div>
			))}
			<Button type="submit" size="sm" disabled={isPending || !url || !username || !password}>
				{t("save_btn")}
			</Button>
		</form>
	);
}
```

- [ ] **Step 3: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/features/app/scanner/components/contact-item.tsx src/features/app/scanner/components/carddav-config-form.tsx
git commit -m "feat: add ContactItem and CarddavConfigForm components"
```

---

## Task 13: UI — ContactsDrawer

**Files:**
- Create: `src/features/app/scanner/components/contacts-drawer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/features/app/scanner/components/contacts-drawer.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { UsersIcon, SettingsIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { listContacts } from "../actions/list-contacts.action";
import { ContactItem } from "./contact-item";
import { CarddavConfigForm } from "./carddav-config-form";
import type { UserCarddavConfig } from "@/db/schemas/contacts";

interface ContactsDrawerProps {
	carddavConfig: UserCarddavConfig | null;
}

export function ContactsDrawer({ carddavConfig: initialConfig }: ContactsDrawerProps) {
	const t = useTranslations("scanner.drawer");
	const [open, setOpen] = useState(false);
	const [showCarddavForm, setShowCarddavForm] = useState(false);
	const [carddavConfig, setCarddavConfig] = useState(initialConfig);

	const { data: contacts = [], refetch } = useQuery({
		queryKey: ["contacts"],
		queryFn: async () => {
			const result = await listContacts();
			return result?.data ?? [];
		},
		enabled: open,
	});

	const carddavConfigured = !!carddavConfig;

	return (
		<>
			<Button
				size="icon"
				variant="outline"
				className={`fixed top-4 right-4 z-50 shadow-md ${!carddavConfigured ? "border-orange-400" : ""}`}
				onClick={() => setOpen(true)}
				title={t("title")}
			>
				<UsersIcon className="size-4" />
				{contacts.length > 0 && (
					<span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-zinc-800 text-white text-[10px] font-bold flex items-center justify-center">
						{contacts.length > 99 ? "99+" : contacts.length}
					</span>
				)}
			</Button>

			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerContent className="max-h-[85vh]">
					<DrawerHeader className="flex items-center justify-between">
						<DrawerTitle>{t("title")}</DrawerTitle>
						<div className="flex gap-2">
							<Button
								size="icon-xs"
								variant="ghost"
								onClick={() => setShowCarddavForm((v) => !v)}
								title={t("configure_carddav")}
								className={!carddavConfigured ? "text-orange-500" : ""}
							>
								<SettingsIcon className="size-4" />
							</Button>
							<DrawerClose asChild>
								<Button size="icon-xs" variant="ghost">
									<ChevronDownIcon className="size-4" />
								</Button>
							</DrawerClose>
						</div>
					</DrawerHeader>

					<div className="px-4 pb-8 overflow-y-auto">
						{showCarddavForm && (
							<div className="mb-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
								<CarddavConfigForm
									initial={carddavConfig}
									onSaved={() => {
										setShowCarddavForm(false);
										setCarddavConfig({ ...carddavConfig! });
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
									carddavConfigured={carddavConfigured}
									onMutated={refetch}
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
pnpm check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/app/scanner/components/contacts-drawer.tsx
git commit -m "feat: add ContactsDrawer with FAB and bottom sheet"
```

---

## Task 14: UI — ScannerWizard (orchestrator)

**Files:**
- Create: `src/features/app/scanner/components/scanner-wizard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/features/app/scanner/components/scanner-wizard.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CaptureStep } from "./steps/capture-step";
import { ProcessingStep } from "./steps/processing-step";
import { ReviewStep } from "./steps/review-step";
import { ContactsDrawer } from "./contacts-drawer";
import type { ContactData } from "@/lib/types";
import type { UserCarddavConfig } from "@/db/schemas/contacts";

type Step = "capture" | "processing" | "review";

interface ScannerWizardProps {
	carddavConfig: UserCarddavConfig | null;
}

export function ScannerWizard({ carddavConfig }: ScannerWizardProps) {
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
			<ContactsDrawer carddavConfig={carddavConfig} />

			{step === "capture" && <CaptureStep onImageSelected={handleImageSelected} />}

			{step === "processing" && selectedFile && (
				<ProcessingStep
					file={selectedFile}
					onDone={handleProcessingDone}
					onError={handleProcessingError}
				/>
			)}

			{step === "review" && contactData && (
				<ReviewStep
					imageUrl={imageUrl}
					data={contactData}
					onSave={reset}
					onRetry={reset}
				/>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/features/app/scanner/components/scanner-wizard.tsx
git commit -m "feat: add ScannerWizard orchestrator component"
```

---

## Task 15: Wire `/app` page

**Files:**
- Modify: `app/(app)/app/page.tsx`

- [ ] **Step 1: Replace page content**

```typescript
// app/(app)/app/page.tsx
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import authServer from "@/lib/auth/server";
import { db } from "@/lib/db";
import { userCarddavConfig } from "@/db/schemas";
import { ScannerWizard } from "@/features/app/scanner/components/scanner-wizard";

export default async function App() {
	const session = await authServer.api.getSession({ headers: await headers() });
	const userId = session!.user.id;

	const [carddavConfig] = await db
		.select()
		.from(userCarddavConfig)
		.where(eq(userCarddavConfig.userId, userId));

	return <ScannerWizard carddavConfig={carddavConfig ?? null} />;
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/(app)/app/page.tsx
git commit -m "feat: wire ScannerWizard into /app page"
```

---

## Task 16: PWA — Permissions-Policy header

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Read current next.config.ts**

```bash
cat next.config.ts
```

- [ ] **Step 2: Add Permissions-Policy header**

Open `next.config.ts`. Add (or merge into existing) a `headers` export that sets `Permissions-Policy: camera=*` to allow camera access from any origin on the same domain. The file typically looks like:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "Permissions-Policy",
						value: "camera=*",
					},
				],
			},
		];
	},
};

export default nextConfig;
```

If `next.config.ts` already has a `headers()` function, add the `Permissions-Policy` entry to the existing array.

- [ ] **Step 3: Verify**

```bash
pnpm check
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git commit -m "feat: allow camera permissions via Permissions-Policy header"
```

---

## Task 17: Smoke test — run the app end to end

- [ ] **Step 1: Start the app**

```bash
just up
```

- [ ] **Step 2: Open browser**

Navigate to `http://localhost:3000`. Sign in with a magic link. Go to `/app`.

- [ ] **Step 3: Verify capture step**
  - Page shows "Scanner une carte" (or "Scan a card")
  - Two buttons: Caméra + Galerie
  - Browser prompts for camera permission when clicking Caméra
  - After granting, camera input opens
  - Selecting an image shows a preview
  - "Analyser" button becomes active

- [ ] **Step 4: Verify processing step**
  - Clicking "Analyser" transitions to spinner
  - If Ollama is running with `llava` model: transitions to review step with extracted data
  - If Ollama is down: shows error toast, returns to capture step

- [ ] **Step 5: Verify review step**
  - Fields are editable
  - "Sauvegarder" saves contact, returns to capture
  - "Recommencer" returns to capture without saving

- [ ] **Step 6: Verify contacts drawer**
  - FAB (top right) shows saved contacts
  - "⬇ vCard" downloads a `.vcf` file
  - "↑ Radicale" is disabled with warning when CardDAV not configured
  - ⚙ icon opens CardDAV config form
  - Saving config enables sync button

- [ ] **Step 7: Commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: address smoke test findings"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Camera + gallery input (Task 9)
- ✅ Camera permission with granted/denied/pending states (Task 9)
- ✅ AI extraction via Ollama (Task 6, Task 10)
- ✅ Editable fields before save (Task 11)
- ✅ Save to DB (Task 6)
- ✅ Reset to capture after save (Task 11, 14)
- ✅ Contacts drawer with FAB (Task 13)
- ✅ Download vCard per contact (Task 12)
- ✅ Per-user CardDAV config stored in DB (Task 7, Task 12)
- ✅ Sync to Radicale (Task 7, Task 12)
- ✅ Warning when CardDAV not configured (Task 12, 13)
- ✅ Ollama env vars (Task 4)
- ✅ DB migrations (Task 5)
- ✅ i18n fr/en (Task 8)
- ✅ PWA Permissions-Policy header (Task 16)
- ✅ `carddav.ts` refactored to accept credentials (Task 3)
- ✅ `anyAuthenticatedAction` for admin users (Task 2)

**Type consistency:**
- `ContactData` defined in `src/lib/types.ts`, used consistently across all components/actions
- `Contact` type exported from `db/schemas/contacts.ts` as `typeof contacts.$inferSelect`
- `UserCarddavConfig` exported from same file
- `saveContact` action named `saveContact` throughout — no collision with `carddav.ts` `saveContact` (imported as `cardDavSaveContact` in sync action)
