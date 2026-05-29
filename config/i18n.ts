import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { env } from "@/env";

export const routing = defineRouting({
	locales: ["fr", "en"],
	defaultLocale: (env.APP_LOCALE as "fr" | "en") || "fr",
	localePrefix: "never",
});

export type AppLocale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
