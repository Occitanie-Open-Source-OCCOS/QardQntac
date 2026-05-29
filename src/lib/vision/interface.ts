import type { ContactData } from "@/lib/types";

export interface VisionProvider {
	analyzeCard(imageBase64: string): Promise<ContactData>;
}
