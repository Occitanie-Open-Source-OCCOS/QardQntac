import type { MetadataRoute } from "next";
import { projectConfig } from "@/config/project";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: projectConfig.name,
		short_name: projectConfig.name,
		description: projectConfig.description,
		start_url: "/",
		display: "standalone",
		background_color: "#060505",
		theme_color: "#060505",
		icons: [
			{
				src: "/favicon.ico",
				sizes: "any",
				type: "image/x-icon",
			},
			{
				src: "/assets/android-chrome-192x192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/assets/android-chrome-512x512.png",
				sizes: "512x512",
				type: "image/png",
			},
			{
				src: "/assets/apple-touch-icon.png",
				sizes: "180x180",
				type: "image/png",
			},
			{
				src: "/assets/favicon-16x16.png",
				sizes: "16x16",
				type: "image/png",
			},
			{
				src: "/assets/favicon-32x32.png",
				sizes: "32x32",
				type: "image/png",
			},
		],
	};
}
