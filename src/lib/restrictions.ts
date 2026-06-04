import { env } from "@/env";

export const isWhitelisted = (email: string): boolean => {
	const domains = env.AUTH_WHITELISTED_DOMAINS;
	if (domains.length === 0) return true;

	const lowerEmail = email.toLowerCase();
	const parts = lowerEmail.split("@");
	if (parts.length !== 2) return false;
	const domain = parts[1];

	return !!(domain && domains.includes(domain));
};
