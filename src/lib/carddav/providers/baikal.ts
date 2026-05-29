import type { AddressBook } from "@/lib/types";
import * as http from "../http";
import type { CardDavCredentials, CardDavProvider } from "../interface";

export class BaikalProvider implements CardDavProvider {
	readonly type = "baikal";
	readonly name = "Baikal";
	readonly urlPlaceholder = "http://host/baikal/dav.php/addressbooks/user/default/";
	readonly urlHint = "URL de votre instance Baikal (dav.php/addressbooks/…)";

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
