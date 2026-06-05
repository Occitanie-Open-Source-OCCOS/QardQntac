"use client";

import { AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ValidationState } from "../detection/use-card-detector";

interface CardValidationBadgeProps {
	state: ValidationState;
}

export function CardValidationBadge({ state }: CardValidationBadgeProps) {
	const t = useTranslations("scanner.capture");

	if (state === "idle") return null;

	if (state === "valid") {
		return (
			<div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full">
				<CheckCircleIcon className="size-3" />
				<span>{t("card_detected")}</span>
			</div>
		);
	}

	return (
		<div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500/90 text-white text-xs px-2 py-1 rounded-full">
			<AlertCircleIcon className="size-3" />
			<span>{state === "error" ? t("validation_error") : t("not_a_card")}</span>
		</div>
	);
}
