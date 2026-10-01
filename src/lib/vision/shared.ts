import type { ContactData, PhoneNumber } from "@/lib/types";
import { emptyContact } from "@/lib/types";

type ScalarField = Exclude<keyof ContactData, "phones">;

const FIELD_ALIASES: Record<ScalarField, RegExp> = {
  firstname: /^(?:firstname|first name|prénom|prenom|given|given name)$/i,
  lastname: /^(?:lastname|last name|nom de famille|surname|family|family name)$/i,
  name: /^(?:name|nom|full name)$/i,
  title: /^(?:title|titre|poste|position|role)$/i,
  company: /^(?:company|company name|société|entreprise|organization|org)$/i,
  email: /^(?:email|e-mail|mail|courriel)$/i,
  website: /^(?:website|site|url|web)$/i,
  address: /^(?:address|adresse|postal address|mailing address)$/i,
};

const PHONE_FIELD =
  /\b(?:phones?|téléphone|telephone|tel|mobile|cell|fax|direct|office|work|home|reception|whatsapp)\b/i;

function cleanString(value: unknown): string {
  if (typeof value !== "string") return "";

  const text = value.trim();

  return /^(n\/?a|not available|unknown|none|null|undefined|-)$/i.test(text)
    ? ""
    : text;
}

function cleanPhoneLabel(value: unknown): string {
  if (typeof value !== "string") return "";

  return value.trim().replace(/[:：]+$/u, "").trim();
}

function parsePhones(value: unknown): PhoneNumber[] {
  const entries = Array.isArray(value) ? value : [value];
  const phones: PhoneNumber[] = [];

  for (const entry of entries) {
    if (typeof entry === "string") {
      const number = cleanString(entry);
      if (number) phones.push({ number, label: "" });
      continue;
    }

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const item = entry as Record<string, unknown>;
    const number = cleanString(item.number);

    if (!number) continue;

    phones.push({
      number,
      label: cleanPhoneLabel(item.label),
    });
  }

  return phones;
}

function looksLikePhoneNumber(value: string): boolean {
  return (
    (value.match(/\d/g)?.length ?? 0) >= 5 &&
    /^\+?[\d\s()./-]+(?:\s*(?:ext\.?|x|#)\s*\d+)?$/i.test(value)
  );
}

function parseMarkdownList(raw: string): ContactData | null {
  const contact = emptyContact();
  let matched = 0;

  for (const line of raw.split("\n")) {
    const match = line.match(
      /^\s*(?:[-*]\s+)?\**([^:*]+?)\**\s*:\s*\**(.+?)\**\s*$/,
    );

    if (!match) continue;

    const field = match[1].trim();
    const value = cleanString(match[2]);

    if (!value) continue;

    const scalarField = (
      Object.entries(FIELD_ALIASES) as [ScalarField, RegExp][]
    ).find(([, pattern]) => pattern.test(field));

    if (scalarField) {
      contact[scalarField[0]] = value;
      matched++;
      continue;
    }

    // Also accept unfamiliar labels when the value looks like a number.
    if (PHONE_FIELD.test(field) || looksLikePhoneNumber(value)) {
      contact.phones.push({
        number: value,
        label: /^(phones?|téléphone|telephone|tel)$/i.test(field)
          ? ""
          : cleanPhoneLabel(field),
      });
      matched++;
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
      const parsed: unknown = JSON.parse(jsonMatch[0]);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const item = parsed as Record<string, unknown>;

        return {
          name: cleanString(item.name),
          firstname: cleanString(item.firstname),
          lastname: cleanString(item.lastname),
          title: cleanString(item.title),
          company: cleanString(item.company),
          email: cleanString(item.email),
          phones: parsePhones(item.phones ?? item.phone),
          website: cleanString(item.website),
          address: cleanString(item.address),
        };
      }
    } catch {
      // Some providers return a Markdown list instead of valid JSON.
    }
  }

  return parseMarkdownList(cleaned) ?? emptyContact();
}

export const SYSTEM_PROMPT = `
You are a contact information extractor.

If the image does not contain a business card or readable contact information,
return:
{"name":"","firstname":"","lastname":"","title":"","company":"","email":"","phones":[],"website":"","address":""}

Otherwise:
1. Extract all fields explicitly visible in the image.
2. Set "name" to the full name exactly as printed and split it into
   "firstname" and "lastname". If the split is unclear, put the whole name
   in "lastname" and leave "firstname" empty.
3. If company is missing but an email is present, infer the company from
   the email domain.
4. If website is missing but an email is present, infer the website from
   the email domain.
5. "phones" must be an array of objects with exactly these keys:
   {"number":"...","label":"..."}
6. Extract every phone number, including fax numbers, as a separate item.
   Never combine multiple numbers into one string.
7. Preserve each phone number as printed.
8. Preserve the wording and capitalization of each printed phone label,
   but omit trailing separator colons. For example, "Mobile:" becomes
   "Mobile" and "Office:" becomes "Office".
   Do not replace labels with a predefined category.
9. If a number has no visible label, use an empty string for its label.
   Do not invent a label.
10. Use empty strings for missing scalar fields and [] for missing phones.
    Do not use placeholders such as "N/A", "unknown", or "not available".

Return only a valid JSON object with exactly these fields:
name, firstname, lastname, title, company, email, phones, website, address.
Do not include Markdown or explanations.
`.trim();
