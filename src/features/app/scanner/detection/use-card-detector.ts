"use client";

import { useEffect, useState } from "react";
import { scoreGalleryImage } from "./card-detection";

const MAX_ANALYSIS_WIDTH = 640;

export type ValidationState = "idle" | "valid" | "invalid" | "error";

export interface UseCardDetectorResult {
	validationState: ValidationState;
	isChecking: boolean;
}

async function analyzeFile(file: File): Promise<ValidationState> {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			try {
				const scale = img.naturalWidth > MAX_ANALYSIS_WIDTH ? MAX_ANALYSIS_WIDTH / img.naturalWidth : 1;
				const w = Math.round(img.naturalWidth * scale);
				const h = Math.round(img.naturalHeight * scale);
				const canvas = document.createElement("canvas");
				canvas.width = w;
				canvas.height = h;
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					resolve("error");
					return;
				}
				ctx.drawImage(img, 0, 0, w, h);
				const imageData = ctx.getImageData(0, 0, w, h);
				URL.revokeObjectURL(url);
				const result = scoreGalleryImage(imageData);
				resolve(result.valid ? "valid" : "invalid");
			} catch {
				URL.revokeObjectURL(url);
				resolve("error");
			}
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			resolve("error");
		};
		img.src = url;
	});
}

export function useCardDetector(file: File | null): UseCardDetectorResult {
	const [validationState, setValidationState] = useState<ValidationState>("idle");
	const [isChecking, setIsChecking] = useState(false);

	useEffect(() => {
		if (!file) {
			setIsChecking(false);
			setValidationState("idle");
			return;
		}
		let cancelled = false;
		setIsChecking(true);
		setValidationState("idle");
		analyzeFile(file)
			.then((state) => {
				if (!cancelled) setValidationState(state);
			})
			.catch(() => {
				if (!cancelled) setValidationState("error");
			})
			.finally(() => {
				if (!cancelled) setIsChecking(false);
			});
		return () => {
			cancelled = true;
		};
	}, [file]);

	return { validationState, isChecking };
}
