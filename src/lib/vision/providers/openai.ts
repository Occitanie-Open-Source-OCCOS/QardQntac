import { env } from "@/env";
import { emptyContact } from "@/lib/types";
import type { ContactData } from "@/lib/types";
import type { VisionProvider } from "../interface";
import { SYSTEM_PROMPT, parseModelOutput } from "../shared";

export class OpenAIProvider implements VisionProvider {
	async analyzeCard(imageBase64: string): Promise<ContactData> {
		const apiKey = env.OPENAI_API_KEY;
		const model = env.OPENAI_MODEL;
		if (!apiKey) throw new Error("OPENAI_API_KEY manquant dans .env");

		let res: Response;
		try {
			res = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model,
					response_format: { type: "json_object" },
					messages: [
						{ role: "system", content: SYSTEM_PROMPT },
						{
							role: "user",
							content: [
								{
									type: "image_url",
									image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
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
			throw new Error("OpenAI non disponible — vérifiez votre connexion");
		}

		if (res.status === 401) throw new Error("OPENAI_API_KEY invalide");
		if (!res.ok) throw new Error(`OpenAI a retourné une erreur ${res.status}`);

		try {
			const json = await res.json();
			const content: string = json?.choices?.[0]?.message?.content ?? "";
			return parseModelOutput(content);
		} catch {
			return emptyContact();
		}
	}
}
