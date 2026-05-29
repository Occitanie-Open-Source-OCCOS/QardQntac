import { getRequestConfig } from "next-intl/server";
import { type AppLocale, routing } from "@/config/i18n";

function isValidLocale(locale: string): locale is AppLocale {
	return routing.locales.includes(locale as AppLocale);
}

export default getRequestConfig(async ({ requestLocale }) => {
	const requestedLocale = await requestLocale;
	const locale = requestedLocale && isValidLocale(requestedLocale) ? requestedLocale : routing.defaultLocale;

	const dirs = ["emails", "auth", "scanner"];

	const pathMap: Record<string, string> = {
		scanner: "app/scanner",
	};

	const messages = Object.fromEntries(
		await Promise.all(
			dirs.map(async (dir) => {
				const path = pathMap[dir] ?? dir;
				const mod = await import(`../features/${path}/translations/${locale}.json`);
				return [dir, mod.default];
			}),
		),
	);

	return {
		locale,
		messages,
	};
});
