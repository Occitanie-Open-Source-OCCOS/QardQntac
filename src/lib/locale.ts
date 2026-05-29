"use server";

import { cookies } from "next/headers";
import type { AppLocale } from "@/config/i18n";

const COOKIE_NAME = "app_locale";

export async function getCookieLocale() {
	return (await cookies()).get(COOKIE_NAME)?.value;
}

export async function setCookieLocale(locale: AppLocale) {
	(await cookies()).set(COOKIE_NAME, locale);
}
