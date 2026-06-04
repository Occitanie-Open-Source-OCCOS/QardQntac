"use client";

import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useEffect } from "react";
import type { ContactData } from "@/lib/types";
import { analyzeCard } from "../../actions/analyze-card.action";

interface ProcessingStepProps {
	file: File;
	onDone: (imageDataUrl: string, data: ContactData) => void;
	onError: (message: string) => void;
}

async function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
	});
}

export function ProcessingStep({ file, onDone, onError }: ProcessingStepProps) {
	const t = useTranslations("scanner.processing");
	const tErrors = useTranslations("scanner.errors");
	const { executeAsync } = useAction(analyzeCard);

	useEffect(() => {
		let cancelled = false;
		async function run() {
			try {
				const imageDataUrl = await fileToDataUrl(file);
				if (cancelled) return;
				const imageBase64 = imageDataUrl.split(",")[1];
				const result = await executeAsync({ imageBase64 });
				if (cancelled) return;
				if (result?.serverError) {
					onError(result.serverError);
					return;
				}
				if (result?.data) {
					onDone(imageDataUrl, result.data);
				}
			} catch (e) {
				if (!cancelled) onError(e instanceof Error ? e.message : tErrors("ollama_down"));
			}
		}
		run();
		return () => {
			cancelled = true;
		};
	}, [file]);

	return (
		<div className="flex flex-col items-center justify-center gap-4 py-24 px-4">
			<div className="size-12 rounded-full border-4 border-muted border-t-foreground animate-spin" />
			<h2 className="text-lg font-semibold">{t("title")}</h2>
			<p className="text-sm text-muted-foreground">{t("subtitle")}</p>
		</div>
	);
}
