import { env } from "@/env";
import type { ContactData } from "@/lib/types";
import { emptyContact } from "@/lib/types";
import type { VisionProvider } from "../interface";
import { parseModelOutput, SYSTEM_PROMPT } from "../shared";

export class AnthropicProvider implements VisionProvider {
	async analyzeCard(imageBase64: string): Promise<ContactData> {
		const apiKey = env.ANTHROPIC_API_KEY;
		const model = env.ANTHROPIC_MODEL;
		if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquant dans .env");

		let res: Response;
		try {
			res = await fetch("https://api.anthropic.com/v1/messages", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": apiKey,
					"anthropic-version": "2023-06-01",
				},
				body: JSON.stringify({
					model,
					max_tokens: 1024,
					system: SYSTEM_PROMPT,
					messages: [
						{
							role: "user",
							content: [
								{
									type: "image",
									source: {
										type: "base64",
										media_type: "image/jpeg",
										data: imageBase64,
									},
								},
								{
									type: "text",
									text: "Extract the contact information from this business card image.",
								},
							],
						},
					],
				}),
			});
		} catch {
			throw new Error("Anthropic non disponible — vérifiez votre connexion");
		}

		if (res.status === 401) throw new Error("ANTHROPIC_API_KEY invalide");
		if (!res.ok) throw new Error(`Anthropic a retourné une erreur ${res.status}`);

		try {
			const json = await res.json();
			const content: string = json?.content?.[0]?.text ?? "";
			return parseModelOutput(content);
		} catch {
			return emptyContact();
		}
	}
}
