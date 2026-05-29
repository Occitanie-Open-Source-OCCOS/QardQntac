import { env } from "@/env";
import type { ContactData } from "@/lib/types";
import { emptyContact } from "@/lib/types";
import type { VisionProvider } from "../interface";
import { parseModelOutput, SYSTEM_PROMPT } from "../shared";

export class GeminiProvider implements VisionProvider {
	async analyzeCard(imageBase64: string): Promise<ContactData> {
		const apiKey = env.GEMINI_API_KEY;
		const model = env.GEMINI_MODEL;
		if (!apiKey) throw new Error("GEMINI_API_KEY manquant dans .env");

		let res: Response;
		try {
			res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
						contents: [
							{
								parts: [
									{
										inline_data: {
											mime_type: "image/jpeg",
											data: imageBase64,
										},
									},
									{
										text: "Extract the contact information from this business card image.",
									},
								],
							},
						],
						generationConfig: { responseMimeType: "application/json" },
					}),
				},
			);
		} catch {
			throw new Error("Gemini non disponible — vérifiez votre connexion");
		}

		if (res.status === 401 || res.status === 403) throw new Error("GEMINI_API_KEY invalide");
		if (!res.ok) throw new Error(`Gemini a retourné une erreur ${res.status}`);

		try {
			const json = await res.json();
			const content: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
			return parseModelOutput(content);
		} catch {
			return emptyContact();
		}
	}
}
