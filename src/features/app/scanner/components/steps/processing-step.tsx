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

const MAX_PX = 1920;
const JPEG_QUALITY = 0.82;

async function compressImage(file: File): Promise<string> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, MAX_PX / Math.max(bitmap.width, bitmap.height));
	const w = Math.round(bitmap.width * scale);
	const h = Math.round(bitmap.height * scale);
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
	bitmap.close();
	return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export function ProcessingStep({ file, onDone, onError }: ProcessingStepProps) {
	const t = useTranslations("scanner.processing");
	const tErrors = useTranslations("scanner.errors");
	const { executeAsync } = useAction(analyzeCard);

	useEffect(() => {
		let cancelled = false;
		async function run() {
			try {
				const imageDataUrl = await compressImage(file);
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
