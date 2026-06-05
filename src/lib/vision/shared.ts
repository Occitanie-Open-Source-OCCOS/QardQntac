import type { ContactData } from "@/lib/types";
import { emptyContact } from "@/lib/types";

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
			const clean = (v: unknown): string => {
				const s = v != null ? String(v).trim() : "";
				return /^(n\/?a|not available|unknown|none|null|undefined|-)$/i.test(s) ? "" : s;
			};
			return {
				name: clean(parsed.name),
				title: clean(parsed.title),
				company: clean(parsed.company),
				email: clean(parsed.email),
				phone: clean(parsed.phone),
				website: clean(parsed.website),
				address: clean(parsed.address),
			};
		} catch {}
	}
	return parseMarkdownList(cleaned) ?? emptyContact();
}

export const SYSTEM_PROMPT =
	'You are a contact information extractor. Examine the image carefully. If the image does NOT contain a business card or readable contact information (e.g. it is a nature photo, a person, a landscape, or has no visible text), return {"name":"","title":"","company":"","email":"","phone":"","website":"","address":""}. If the image IS a business card, extract only the information explicitly visible in the image — do NOT invent, infer, or guess any field. Return ONLY a valid JSON object with exactly these fields: name, title, company, email, phone, website, address. Use empty string "" for any field not present in the image. Never use placeholder text like "N/A", "not available", "unknown", or similar — only real values or empty string. Output only the JSON, no explanation.';
