import type { AddressBook } from "@/lib/types";

export type CardDavCredentials = {
	url: string;
	username: string;
	password: string;
};

export interface CardDavProvider {
	readonly type: string;

	testConnection(creds: CardDavCredentials): Promise<void>;
	saveContact(vcard: string, bookHref: string, creds: CardDavCredentials, remoteId?: string): Promise<string>;
	deleteContact(remoteId: string, bookHref: string, creds: CardDavCredentials): Promise<void>;
	discoverBooks(creds: CardDavCredentials): Promise<AddressBook[]>;
}
