import type { MetadataRoute } from "next";
import { env } from "@/env";

const BASE_URL = env.APP_URL;

export default function robots(): MetadataRoute.Robots {
	const isProduction = BASE_URL && !BASE_URL.includes("localhost");

	if (!isProduction) {
		return {
			rules: {
				userAgent: "*",
				disallow: "/",
			},
		};
	}

	return {
		rules: {
			userAgent: "*",
			allow: "/",
		},
		sitemap: `${BASE_URL}/sitemap.xml`,
		host: BASE_URL,
	};
}
