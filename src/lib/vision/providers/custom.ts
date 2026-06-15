import { env } from "@/env";
import { emptyContact } from "@/lib/types";
import type { ContactData } from "@/lib/types";
import type { VisionProvider } from "../interface";
import { parseModelOutput, SYSTEM_PROMPT } from "../shared";

export class CustomProvider implements VisionProvider {
  async analyzeCard(imageBase64: string): Promise<ContactData> {
    const baseUrl = env.CUSTOM_BASE_URL;
    const model = env.CUSTOM_MODEL;
    const apiKey = env.CUSTOM_API_KEY;

    if (!baseUrl) throw new Error("CUSTOM_BASE_URL missing in .env");
    if (!model) throw new Error("CUSTOM_MODEL missing in .env");

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
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
      throw new Error(
        `Custom provider unreachable at ${baseUrl} — check your connection`,
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Custom provider error ${res.status}: ${body}`);
    }

    try {
      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      return parseModelOutput(content);
    } catch {
      return emptyContact();
    }
  }
}
