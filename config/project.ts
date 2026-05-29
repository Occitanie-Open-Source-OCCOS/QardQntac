import { env } from "@/env";

export const projectConfig = {
	name: env.NEXT_PUBLIC_APP_NAME || "KardQntact",
	description:
		"KardQntact est un analyseur de carte de visite open source. Il permet d'extraire et de structurer les informations contenues dans les cartes de visite, facilitant ainsi la gestion des contacts.",
	url: env.NEXT_PUBLIC_APP_URL,
	keywords: ["open source", "carte de visite", "analyseur", "contact", "gestion"],
	publisher: env.NEXT_PUBLIC_APP_NAME || "KardQntact",
	creators: [],
	version: "1.0.0",
};
