import { WHITELISTED_DOMAINS } from "@/config/restrictions";

export const isWhitelisted = (email: string): boolean => {
	const lowerEmail = email.toLowerCase();
	const parts = lowerEmail.split("@");
	if (parts.length !== 2) return false;
	const domain = parts[1];

	if (domain && WHITELISTED_DOMAINS.includes(domain)) {
		return true;
	}

	return false;
};
