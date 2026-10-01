import type { ContactData } from "./types";

function escapeVCardValue(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function phoneVCardType(label: string): string | undefined {
  switch (label.trim().toLowerCase()) {
    case "mobile":
    case "cell":
    case "cellular":
    case "portable":
      return "CELL";

    case "home":
    case "personal":
    case "domicile":
      return "HOME";

    case "work":
    case "office":
    case "direct":
    case "bureau":
    case "ligne directe":
      return "WORK";

    case "fax":
      return "FAX";

    case "work fax":
    case "office fax":
      return "WORK,FAX";

    case "home fax":
      return "HOME,FAX";

    default:
      return undefined;
  }
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
		...contact.phones.flatMap((phone, index) => {
		  const number = phone.number.trim();
		  if (!number) return [];

		  const group = `item${index + 1}`;
		  const label = phone.label.trim();
		  const type = phoneVCardType(label);

		  const phoneLines = [
		    `${group}.TEL${type ? `;TYPE=${type}` : ""}:${e(number)}`,
		  ];

		  if (label) {
		    phoneLines.push(`${group}.X-ABLabel:${e(label)}`);
		  }

		  return phoneLines;
		}),
		contact.website ? `URL:${e(contact.website)}` : null,
		contact.address ? `ADR:;;${e(contact.address)};;;;` : null,
		tagNames.length > 0 ? `CATEGORIES:${tagNames.map(e).join(",")}` : null,
		"END:VCARD",
	].filter((line): line is string => line !== null);
	return `${lines.join("\r\n")}\r\n`;
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
