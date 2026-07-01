import type { ContactData } from "./types";

function escapeVCardValue(s: string): string {
	return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateVCard(contact: ContactData, tagNames: string[] = []): string {
	const e = escapeVCardValue;
	const lines: string[] = [
		"BEGIN:VCARD",
		"VERSION:3.0",
		`N:${e(contact.lastname)};${e(contact.firstname)};;;`,
		`FN:${e(contact.name)}`,
		contact.company ? `ORG:${e(contact.company)}` : null,
		contact.title ? `TITLE:${e(contact.title)}` : null,
		contact.email ? `EMAIL:${e(contact.email)}` : null,
		contact.phone ? `TEL:${e(contact.phone)}` : null,
		contact.website ? `URL:${e(contact.website)}` : null,
		contact.address ? `ADR:;;${e(contact.address)};;;;` : null,
		tagNames.length > 0 ? `CATEGORIES:${tagNames.map(e).join(",")}` : null,
		"END:VCARD",
	].filter((line): line is string => line !== null);
	return lines.join("\r\n");
}

export function vcfFileName(contact: ContactData): string {
	return contact.name ? `${contact.name}.vcf` : "contact.vcf";
}

export function downloadVCard(contact: ContactData, tagNames: string[] = []): void {
	const content = generateVCard(contact, tagNames);
	const blob = new Blob([content], { type: "text/vcard;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = vcfFileName(contact);
	a.click();
	URL.revokeObjectURL(url);
}
