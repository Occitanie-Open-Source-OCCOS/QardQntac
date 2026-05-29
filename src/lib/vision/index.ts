import { env } from "@/env";
import type { ContactData } from "@/lib/types";
import type { VisionProvider } from "./interface";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";
import { OllamaProvider } from "./providers/ollama";
import { OpenAIProvider } from "./providers/openai";

export * from "./interface";
export * from "./shared";

export function getVisionProvider(): VisionProvider {
	switch (env.VISION_PROVIDER) {
		case "openai":
			return new OpenAIProvider();
		case "anthropic":
			return new AnthropicProvider();
		case "gemini":
			return new GeminiProvider();
		default:
			return new OllamaProvider();
	}
}

export async function parseCardImage(imageBase64: string): Promise<ContactData> {
	return getVisionProvider().analyzeCard(imageBase64);
}
