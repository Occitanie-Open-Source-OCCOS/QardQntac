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
