"use server";

import { z } from "zod";
import { anyAuthenticatedAction } from "@/lib/actions";
import { parseCardImage } from "@/lib/ollama";

export const analyzeCard = anyAuthenticatedAction
	.schema(z.object({ imageBase64: z.string().min(1) }))
	.action(async ({ parsedInput: { imageBase64 } }) => {
		return parseCardImage(imageBase64);
	});
