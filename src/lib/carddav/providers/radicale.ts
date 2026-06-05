import type { AddressBook } from "@/lib/types";
import * as http from "../http";
import type { CardDavCredentials, CardDavProvider } from "../interface";

export class RadicaleProvider implements CardDavProvider {
	readonly type = "radicale";
	readonly name = "Radicale";
	readonly urlPlaceholder = "http://host:5232/user/contacts/";
	readonly urlHint = "URL Instance (user/contacts/…)";

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
