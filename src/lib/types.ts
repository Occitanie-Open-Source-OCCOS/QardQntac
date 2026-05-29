export interface ContactData {
	name: string;
	title: string;
	company: string;
	email: string;
	phone: string;
	website: string;
	address: string;
}

export function emptyContact(): ContactData {
	return { name: "", title: "", company: "", email: "", phone: "", website: "", address: "" };
}

export interface AddressBook {
	href: string;
	name: string;
}
