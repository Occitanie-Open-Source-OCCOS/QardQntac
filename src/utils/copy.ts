import { toast } from "sonner";

export async function copyToClipboard(
	text: string,
	successMessage: string = "Copié dans le presse-papier !",
): Promise<boolean> {
	if (!navigator?.clipboard) {
		toast.error("Le presse-papier n'est pas supporté par votre navigateur.");
		return false;
	}

	try {
		await navigator.clipboard.writeText(text);
		toast.success(successMessage);
		return true;
	} catch (error) {
		console.error("Failed to copy:", error);
		toast.error("Impossible de copier le texte.");
		return false;
	}
}
