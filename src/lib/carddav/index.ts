export * from "./http";
export * from "./interface";

import type { CardDavProvider } from "./interface";
import { BaikalProvider } from "./providers/baikal";
import { CustomProvider } from "./providers/custom";
import { NextcloudProvider } from "./providers/nextcloud";
import { RadicaleProvider } from "./providers/radicale";

export function getProvider(type: string): CardDavProvider {
	switch (type) {
		case "radicale":
			return new RadicaleProvider();
		case "baikal":
			return new BaikalProvider();
		case "nextcloud":
			return new NextcloudProvider();
		default:
			return new CustomProvider();
	}
}

export const PROVIDER_TYPES = ["radicale", "baikal", "nextcloud", "custom"] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];
