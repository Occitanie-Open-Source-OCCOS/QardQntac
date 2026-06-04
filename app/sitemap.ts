import type { MetadataRoute } from "next";
import { env } from "@/env";

const BASE_URL = env.APP_URL;

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: `${BASE_URL}`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 1,
		},
	];
}
