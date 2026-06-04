import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { env } from "@/env";

export const routing = defineRouting({
	locales: ["fr", "en"],
	defaultLocale: env.LOCALE,
	localePrefix: "never",
});

export type AppLocale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
