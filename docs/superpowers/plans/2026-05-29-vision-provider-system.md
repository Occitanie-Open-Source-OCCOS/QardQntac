# Vision Provider System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Ollama-only `src/lib/ollama.ts` with a `VisionProvider` interface supporting Ollama, OpenAI, Anthropic, and Gemini, selected via `VISION_PROVIDER` env var. Ollama remains the default — no breaking change.

**Architecture:** `src/lib/vision/` mirrors the CardDAV provider pattern — `interface.ts` defines one-method contract, `shared.ts` holds the prompt and output parser, each provider is an isolated file delegating to those shared utilities, and `index.ts` exposes a `getVisionProvider()` factory + `parseCardImage()` entry point.

**Tech Stack:** Next.js, TypeScript, @t3-oss/env-nextjs, Zod, native `fetch` (no new dependencies)

---

## File Map

**Create:**
- `src/lib/vision/interface.ts` — `VisionProvider` interface
- `src/lib/vision/shared.ts` — `SYSTEM_PROMPT` + `parseModelOutput` (moved from `ollama.ts`)
- `src/lib/vision/providers/ollama.ts` — `OllamaProvider`
- `src/lib/vision/providers/openai.ts` — `OpenAIProvider`
- `src/lib/vision/providers/anthropic.ts` — `AnthropicProvider`
- `src/lib/vision/providers/gemini.ts` — `GeminiProvider`
- `src/lib/vision/index.ts` — factory + `parseCardImage` + re-exports

**Modify:**
- `env.ts` — add `VISION_PROVIDER`, `OPENAI_*`, `ANTHROPIC_*`, `GEMINI_*` vars
- `.env.example` — document new vars
- `src/features/app/scanner/actions/analyze-card.action.ts` — update import path only

**Delete:**
- `src/lib/ollama.ts`

---

## Task 1: Create interface.ts and shared.ts

**Files:**
- Create: `src/lib/vision/interface.ts`
- Create: `src/lib/vision/shared.ts`

- [ ] **Step 1: Create src/lib/vision/interface.ts**

```typescript
import type { ContactData } from "@/lib/types";

export interface VisionProvider {
	analyzeCard(imageBase64: string): Promise<ContactData>;
}
```

- [ ] **Step 2: Create src/lib/vision/shared.ts**

Content moved verbatim from `src/lib/ollama.ts` — `FIELD_ALIASES`, `parseMarkdownList`, `parseModelOutput`, and `SYSTEM_PROMPT`. Read `src/lib/ollama.ts` to copy the exact implementations.

```typescript
import { emptyContact } from "@/lib/types";
import type { ContactData } from "@/lib/types";

const FIELD_ALIASES: Record<keyof ContactData, RegExp> = {
	name: /\b(?:name|nom)\b/i,
	title: /\b(?:title|titre|poste|position|role)\b/i,
	company: /\b(?:company|société|entreprise|organization|org)\b/i,
	email: /\b(?:email|e-mail|mail|courriel)\b/i,
	phone: /\b(?:phone|téléphone|tel|mobile|fax)\b/i,
	website: /\b(?:website|site|url|web)\b/i,
	address: /\b(?:address|adresse)\b/i,
};

function parseMarkdownList(raw: string): ContactData | null {
	const lines = raw.split("\n");
	const contact = emptyContact();
	let matched = 0;
	for (const line of lines) {
		const m = line.match(/^[\s*-]+\**([^:*]+)\**\s*:\s*\**(.+?)\**\s*$/);
		if (!m) continue;
		const [, fieldRaw, value] = m;
		const trimmedValue = value.trim();
		if (!trimmedValue || /^none$/i.test(trimmedValue)) continue;
		for (const [key, pattern] of Object.entries(FIELD_ALIASES) as [keyof ContactData, RegExp][]) {
			if (pattern.test(fieldRaw.trim())) {
				contact[key] = trimmedValue;
				matched++;
				break;
			}
		}
	}
	return matched > 0 ? contact : null;
}

export function parseModelOutput(raw: string): ContactData {
	const cleaned = raw
		.replace(/```json\s*/gi, "")
		.replace(/```/g, "")
		.trim();
	const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
	if (jsonMatch) {
		try {
			const parsed = JSON.parse(jsonMatch[0]);
			return {
				name: parsed.name != null ? String(parsed.name) : "",
				title: parsed.title != null ? String(parsed.title) : "",
				company: parsed.company != null ? String(parsed.company) : "",
				email: parsed.email != null ? String(parsed.email) : "",
				phone: parsed.phone != null ? String(parsed.phone) : "",
				website: parsed.website != null ? String(parsed.website) : "",
				address: parsed.address != null ? String(parsed.address) : "",
			};
		} catch {}
	}
	return parseMarkdownList(cleaned) ?? emptyContact();
}

export const SYSTEM_PROMPT =
	'You are a contact information extractor. Given a business card image, extract all contact details and return ONLY a valid JSON object with exactly these fields: name, title, company, email, phone, website, address. Use empty string "" for any missing field. Output only the JSON, no explanation.';
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
pnpm check 2>&1 | grep "vision/" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/vision/interface.ts src/lib/vision/shared.ts
git commit -m "feat: add VisionProvider interface and shared prompt/parser"
```

---

## Task 2: Create OllamaProvider

**Files:**
- Create: `src/lib/vision/providers/ollama.ts`

- [ ] **Step 1: Create src/lib/vision/providers/ollama.ts**

Logic moved from `src/lib/ollama.ts` `parseCardImage()` function — same behavior, wrapped in a class.

```typescript
import { env } from "@/env";
import { emptyContact } from "@/lib/types";
import type { ContactData } from "@/lib/types";
import type { VisionProvider } from "../interface";
import { SYSTEM_PROMPT, parseModelOutput } from "../shared";

export class OllamaProvider implements VisionProvider {
	async analyzeCard(imageBase64: string): Promise<ContactData> {
		const { OLLAMA_BASE_URL: baseUrl, OLLAMA_MODEL: model } = env;
		let res: Response;
		try {
			res = await fetch(`${baseUrl}/api/chat`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model,
					stream: false,
					format: "json",
					messages: [
						{ role: "system", content: SYSTEM_PROMPT },
						{
							role: "user",
							content: "Extract the contact information from this business card image.",
							images: [imageBase64],
						},
					],
				}),
			});
		} catch {
			throw new Error("Ollama non disponible — vérifie qu'il tourne sur le port 11434");
		}
		if (res.status === 404) throw new Error(`Modèle ${model} introuvable — lance : ollama pull ${model}`);
		if (!res.ok) throw new Error(`Ollama a retourné une erreur ${res.status}`);
		try {
			const json = await res.json();
			const content: string = json?.message?.content ?? "";
			return parseModelOutput(content);
		} catch {
			return emptyContact();
		}
	}
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check 2>&1 | grep "providers/ollama" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/vision/providers/ollama.ts
git commit -m "feat: add OllamaProvider (moved from ollama.ts)"
```

---

## Task 3: Create OpenAIProvider

**Files:**
- Create: `src/lib/vision/providers/openai.ts`

- [ ] **Step 1: Create src/lib/vision/providers/openai.ts**

```typescript
import { env } from "@/env";
import { emptyContact } from "@/lib/types";
import type { ContactData } from "@/lib/types";
import type { VisionProvider } from "../interface";
import { SYSTEM_PROMPT, parseModelOutput } from "../shared";

export class OpenAIProvider implements VisionProvider {
	async analyzeCard(imageBase64: string): Promise<ContactData> {
		const apiKey = env.OPENAI_API_KEY;
		const model = env.OPENAI_MODEL;
		if (!apiKey) throw new Error("OPENAI_API_KEY manquant dans .env");

		let res: Response;
		try {
			res = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model,
					response_format: { type: "json_object" },
					messages: [
						{ role: "system", content: SYSTEM_PROMPT },
						{
							role: "user",
							content: [
								{
									type: "image_url",
									image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
								},
								{
									type: "text",
									text: "Extract the contact information from this business card image.",
								},
							],
						},
					],
				}),
			});
		} catch {
			throw new Error("OpenAI non disponible — vérifiez votre connexion");
		}

		if (res.status === 401) throw new Error("OPENAI_API_KEY invalide");
		if (!res.ok) throw new Error(`OpenAI a retourné une erreur ${res.status}`);

		try {
			const json = await res.json();
			const content: string = json?.choices?.[0]?.message?.content ?? "";
			return parseModelOutput(content);
		} catch {
			return emptyContact();
		}
	}
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check 2>&1 | grep "providers/openai" | head -5
```

Note: `env.OPENAI_API_KEY` and `env.OPENAI_MODEL` will show TypeScript errors until Task 6 (env.ts update). That is expected — fix after Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/lib/vision/providers/openai.ts
git commit -m "feat: add OpenAIProvider (gpt-4o vision)"
```

---

## Task 4: Create AnthropicProvider

**Files:**
- Create: `src/lib/vision/providers/anthropic.ts`

- [ ] **Step 1: Create src/lib/vision/providers/anthropic.ts**

```typescript
import { env } from "@/env";
import { emptyContact } from "@/lib/types";
import type { ContactData } from "@/lib/types";
import type { VisionProvider } from "../interface";
import { SYSTEM_PROMPT, parseModelOutput } from "../shared";

export class AnthropicProvider implements VisionProvider {
	async analyzeCard(imageBase64: string): Promise<ContactData> {
		const apiKey = env.ANTHROPIC_API_KEY;
		const model = env.ANTHROPIC_MODEL;
		if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquant dans .env");

		let res: Response;
		try {
			res = await fetch("https://api.anthropic.com/v1/messages", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": apiKey,
					"anthropic-version": "2023-06-01",
				},
				body: JSON.stringify({
					model,
					max_tokens: 1024,
					system: SYSTEM_PROMPT,
					messages: [
						{
							role: "user",
							content: [
								{
									type: "image",
									source: {
										type: "base64",
										media_type: "image/jpeg",
										data: imageBase64,
									},
								},
								{
									type: "text",
									text: "Extract the contact information from this business card image.",
								},
							],
						},
					],
				}),
			});
		} catch {
			throw new Error("Anthropic non disponible — vérifiez votre connexion");
		}

		if (res.status === 401) throw new Error("ANTHROPIC_API_KEY invalide");
		if (!res.ok) throw new Error(`Anthropic a retourné une erreur ${res.status}`);

		try {
			const json = await res.json();
			const content: string = json?.content?.[0]?.text ?? "";
			return parseModelOutput(content);
		} catch {
			return emptyContact();
		}
	}
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check 2>&1 | grep "providers/anthropic" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/vision/providers/anthropic.ts
git commit -m "feat: add AnthropicProvider (claude vision)"
```

---

## Task 5: Create GeminiProvider

**Files:**
- Create: `src/lib/vision/providers/gemini.ts`

- [ ] **Step 1: Create src/lib/vision/providers/gemini.ts**

```typescript
import { env } from "@/env";
import { emptyContact } from "@/lib/types";
import type { ContactData } from "@/lib/types";
import type { VisionProvider } from "../interface";
import { SYSTEM_PROMPT, parseModelOutput } from "../shared";

export class GeminiProvider implements VisionProvider {
	async analyzeCard(imageBase64: string): Promise<ContactData> {
		const apiKey = env.GEMINI_API_KEY;
		const model = env.GEMINI_MODEL;
		if (!apiKey) throw new Error("GEMINI_API_KEY manquant dans .env");

		let res: Response;
		try {
			res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
						contents: [
							{
								parts: [
									{
										inline_data: {
											mime_type: "image/jpeg",
											data: imageBase64,
										},
									},
									{
										text: "Extract the contact information from this business card image.",
									},
								],
							},
						],
						generationConfig: { responseMimeType: "application/json" },
					}),
				},
			);
		} catch {
			throw new Error("Gemini non disponible — vérifiez votre connexion");
		}

		if (res.status === 401 || res.status === 403) throw new Error("GEMINI_API_KEY invalide");
		if (!res.ok) throw new Error(`Gemini a retourné une erreur ${res.status}`);

		try {
			const json = await res.json();
			const content: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
			return parseModelOutput(content);
		} catch {
			return emptyContact();
		}
	}
}
```

- [ ] **Step 2: Verify**

```bash
pnpm check 2>&1 | grep "providers/gemini" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/vision/providers/gemini.ts
git commit -m "feat: add GeminiProvider (gemini-1.5-flash vision)"
```

---

## Task 6: Create index.ts + update env.ts + .env.example

**Files:**
- Create: `src/lib/vision/index.ts`
- Modify: `env.ts`
- Modify: `.env.example`

- [ ] **Step 1: Create src/lib/vision/index.ts**

```typescript
import { env } from "@/env";
import type { ContactData } from "@/lib/types";
import type { VisionProvider } from "./interface";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";
import { OllamaProvider } from "./providers/ollama";
import { OpenAIProvider } from "./providers/openai";

export * from "./interface";
export * from "./shared";

export function getVisionProvider(): VisionProvider {
	switch (env.VISION_PROVIDER) {
		case "openai":
			return new OpenAIProvider();
		case "anthropic":
			return new AnthropicProvider();
		case "gemini":
			return new GeminiProvider();
		default:
			return new OllamaProvider();
	}
}

export async function parseCardImage(imageBase64: string): Promise<ContactData> {
	return getVisionProvider().analyzeCard(imageBase64);
}
```

- [ ] **Step 2: Update env.ts — add new vars to server section**

In the `server:` block, after the `OLLAMA_MODEL` line, add:

```typescript
VISION_PROVIDER: z.enum(["ollama", "openai", "anthropic", "gemini"]).default("ollama"),
OPENAI_API_KEY: z.string().optional(),
OPENAI_MODEL: z.string().default("gpt-4o"),
ANTHROPIC_API_KEY: z.string().optional(),
ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-20241022"),
GEMINI_API_KEY: z.string().optional(),
GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
```

In the `runtimeEnv:` block, after `OLLAMA_MODEL` line, add:

```typescript
VISION_PROVIDER: process.env.VISION_PROVIDER,
OPENAI_API_KEY: process.env.OPENAI_API_KEY,
OPENAI_MODEL: process.env.OPENAI_MODEL,
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
GEMINI_API_KEY: process.env.GEMINI_API_KEY,
GEMINI_MODEL: process.env.GEMINI_MODEL,
```

- [ ] **Step 3: Update .env.example — add new vars with comments**

After the `OLLAMA_MODEL=llama3.2-vision` line, add:

```env

# Vision provider: ollama (default) | openai | anthropic | gemini
VISION_PROVIDER=ollama

# OpenAI (required if VISION_PROVIDER=openai)
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o

# Anthropic (required if VISION_PROVIDER=anthropic)
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Google Gemini (required if VISION_PROVIDER=gemini)
# GEMINI_API_KEY=...
# GEMINI_MODEL=gemini-1.5-flash
```

- [ ] **Step 4: Verify full type check passes**

```bash
pnpm check 2>&1 | grep -E "vision/|env\.ts" | head -20
```

Expected: no errors in vision/ or env.ts files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/vision/index.ts env.ts .env.example
git commit -m "feat: add vision factory, update env schema with VISION_PROVIDER and cloud API keys"
```

---

## Task 7: Update analyze-card action + delete ollama.ts

**Files:**
- Modify: `src/features/app/scanner/actions/analyze-card.action.ts`
- Delete: `src/lib/ollama.ts`

- [ ] **Step 1: Update analyze-card.action.ts — change import only**

```typescript
"use server";

import { z } from "zod";
import { anyAuthenticatedAction } from "@/lib/actions";
import { parseCardImage } from "@/lib/vision";

export const analyzeCard = anyAuthenticatedAction
	.inputSchema(z.object({ imageBase64: z.string().min(1) }))
	.action(async ({ parsedInput: { imageBase64 } }) => {
		return parseCardImage(imageBase64);
	});
```

- [ ] **Step 2: Delete src/lib/ollama.ts**

```bash
rm src/lib/ollama.ts
```

- [ ] **Step 3: Full type check — expect zero errors in changed files**

```bash
pnpm check 2>&1 | grep -E "ollama|vision|analyze-card" | head -20
```

Expected: no errors referencing `ollama.ts` or the new vision files.

- [ ] **Step 4: Final commit**

```bash
git add src/features/app/scanner/actions/analyze-card.action.ts
git rm src/lib/ollama.ts
git commit -m "feat: wire analyze-card to VisionProvider, remove ollama.ts"
```
