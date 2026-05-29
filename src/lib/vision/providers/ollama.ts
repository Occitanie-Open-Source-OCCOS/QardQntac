import { env } from "@/env";
import type { ContactData } from "@/lib/types";
import { emptyContact } from "@/lib/types";
import type { VisionProvider } from "../interface";
import { parseModelOutput, SYSTEM_PROMPT } from "../shared";

export class OllamaProvider implements VisionProvider {
	async analyzeCard(imageBase64: string): Promise<ContactData> {
		const { OLLAMA_BASE_URL: baseUrl, OLLAMA_MODEL: model } = env;
		let res: Response;
		try {
			res = await fetch(`${baseUrl}/api/chat`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model,
					stream: false,
					format: "json",
					messages: [
						{ role: "system", content: SYSTEM_PROMPT },
						{
							role: "user",
							content: "Extract the contact information from this business card image.",
							images: [imageBase64],
						},
					],
				}),
			});
		} catch {
			throw new Error("Ollama non disponible — vérifie qu'il tourne sur le port 11434");
		}
		if (res.status === 404) throw new Error(`Modèle ${model} introuvable — lance : ollama pull ${model}`);
		if (!res.ok) throw new Error(`Ollama a retourné une erreur ${res.status}`);
		try {
			const json = await res.json();
			const content: string = json?.message?.content ?? "";
			return parseModelOutput(content);
		} catch {
			return emptyContact();
		}
	}
}
