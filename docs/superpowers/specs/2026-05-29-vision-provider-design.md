# Vision Provider System — Design Spec

**Date:** 2026-05-29
**Status:** Approved

## Goal

Replace the Ollama-only `src/lib/ollama.ts` with a generic `VisionProvider` interface supporting multiple AI backends (Ollama, OpenAI, Anthropic, Gemini). Provider selected via `VISION_PROVIDER` env var. Ollama remains default — zero breaking change for existing deployments.

---

## Architecture

### File Structure

```
src/lib/vision/
  interface.ts        — VisionProvider interface + ContactData re-export
  shared.ts           — SYSTEM_PROMPT + parseModelOutput (moved from ollama.ts)
  providers/
    ollama.ts         — OllamaProvider
    openai.ts         — OpenAIProvider
    anthropic.ts      — AnthropicProvider
    gemini.ts         — GeminiProvider
  index.ts            — getVisionProvider() factory + parseCardImage() + re-exports

env.ts                — add VISION_PROVIDER, OPENAI_API_KEY/MODEL, ANTHROPIC_API_KEY/MODEL, GEMINI_API_KEY/MODEL
.env.example          — add new vars with comments
src/lib/ollama.ts     — deleted (replaced by src/lib/vision/)
```

`analyze-card.action.ts` — unchanged. Still imports `parseCardImage` from `@/lib/ollama` → path updated to `@/lib/vision`.

---

## Interface

```typescript
// src/lib/vision/interface.ts
import type { ContactData } from "@/lib/types";

export interface VisionProvider {
  analyzeCard(imageBase64: string): Promise<ContactData>;
}
```

Single method. Each provider owns its prompt construction, image encoding, HTTP call, and response parsing. Shared logic (prompt text, output parsing) lives in `shared.ts` and providers call it as needed.

---

## Shared Logic

```typescript
// src/lib/vision/shared.ts
// Content moved verbatim from src/lib/ollama.ts — no logic change
export const SYSTEM_PROMPT: string           // existing constant
export function parseModelOutput(raw: string): ContactData  // existing function
```

All providers use the same `SYSTEM_PROMPT` and `parseModelOutput`. Individual providers only differ in HTTP call format and image encoding.

---

## Provider Implementations

### OllamaProvider
- Reads `OLLAMA_BASE_URL` + `OLLAMA_MODEL` from env
- POST `/api/chat` with `images: [imageBase64]`
- Same logic as current `parseCardImage()` in `ollama.ts`

### OpenAIProvider
- Reads `OPENAI_API_KEY` + `OPENAI_MODEL` (default: `gpt-4o`) from env
- POST `https://api.openai.com/v1/chat/completions`
- Image encoded as `data:image/jpeg;base64,{imageBase64}` in content array
- Uses `response_format: { type: "json_object" }` for structured output

### AnthropicProvider
- Reads `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` (default: `claude-3-5-sonnet-20241022`) from env
- POST `https://api.anthropic.com/v1/messages`
- Image as `{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } }`
- Header: `anthropic-version: 2023-06-01`

### GeminiProvider
- Reads `GEMINI_API_KEY` + `GEMINI_MODEL` (default: `gemini-1.5-flash`) from env
- POST `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`
- Image as `{ inlineData: { mimeType: "image/jpeg", data: imageBase64 } }`

---

## Factory

```typescript
// src/lib/vision/index.ts
export function getVisionProvider(): VisionProvider {
  const type = env.VISION_PROVIDER ?? "ollama";
  switch (type) {
    case "openai":    return new OpenAIProvider();
    case "anthropic": return new AnthropicProvider();
    case "gemini":    return new GeminiProvider();
    default:          return new OllamaProvider();
  }
}

export async function parseCardImage(imageBase64: string): Promise<ContactData> {
  return getVisionProvider().analyzeCard(imageBase64);
}
```

`parseCardImage` is the public entry point — same signature as in current `ollama.ts`. `analyze-card.action.ts` only needs its import path updated.

---

## Environment Variables

```env
# Provider selection (default: ollama — backward compatible)
VISION_PROVIDER=ollama

# Ollama (unchanged)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2-vision

# OpenAI (required if VISION_PROVIDER=openai)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Anthropic (required if VISION_PROVIDER=anthropic)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Google Gemini (required if VISION_PROVIDER=gemini)
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
```

### Validation in env.ts

- `VISION_PROVIDER`: `z.enum(["ollama", "openai", "anthropic", "gemini"]).default("ollama")`
- `OPENAI_API_KEY`: `z.string().optional()`
- `OPENAI_MODEL`: `z.string().default("gpt-4o")`
- `ANTHROPIC_API_KEY`: `z.string().optional()`
- `ANTHROPIC_MODEL`: `z.string().default("claude-3-5-sonnet-20241022")`
- `GEMINI_API_KEY`: `z.string().optional()`
- `GEMINI_MODEL`: `z.string().default("gemini-1.5-flash")`

Runtime validation in factory: if `VISION_PROVIDER=openai` and `OPENAI_API_KEY` is empty → throw `"OPENAI_API_KEY manquant dans .env"`. Same for Anthropic and Gemini.

---

## Error Handling

Each provider throws a clear French error message on failure:
- Ollama: existing messages preserved (`"Ollama non disponible…"`, `"Modèle X introuvable…"`)
- OpenAI: `"OpenAI a retourné une erreur ${status}"`, `"OPENAI_API_KEY invalide"` on 401
- Anthropic: `"Anthropic a retourné une erreur ${status}"`, `"ANTHROPIC_API_KEY invalide"` on 401
- Gemini: `"Gemini a retourné une erreur ${status}"`, `"GEMINI_API_KEY invalide"` on 401/403
- All: network failure → `"${ProviderName} non disponible — vérifiez votre connexion"`

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/vision/interface.ts` | New |
| `src/lib/vision/shared.ts` | New (moved from ollama.ts) |
| `src/lib/vision/providers/ollama.ts` | New (moved from ollama.ts) |
| `src/lib/vision/providers/openai.ts` | New |
| `src/lib/vision/providers/anthropic.ts` | New |
| `src/lib/vision/providers/gemini.ts` | New |
| `src/lib/vision/index.ts` | New |
| `env.ts` | Add 7 new vars |
| `.env.example` | Add new vars with comments |
| `src/features/app/scanner/actions/analyze-card.action.ts` | Update import path only |
| `src/lib/ollama.ts` | Deleted |
