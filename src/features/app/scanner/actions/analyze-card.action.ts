"use server";

import { z } from "zod";
import { anyAuthenticatedAction } from "@/lib/actions";
import { parseCardImage } from "@/lib/vision";
import { searchAddress } from "@/lib/ban";

export const analyzeCard = anyAuthenticatedAction
	.inputSchema(z.object({ imageBase64: z.string().min(1) }))
	.action(async ({ parsedInput: { imageBase64 } }) => {
		const contact = await parseCardImage(imageBase64);

		if (contact.address) {
			const suggestions = await searchAddress(contact.address);
			if (suggestions.length > 0) {
				contact.address = suggestions[0].fulltext;
			}
		}

		return contact;
	});
