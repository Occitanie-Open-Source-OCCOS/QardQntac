"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ContactData } from "@/lib/types";
import { saveContact } from "@/features/app/contacts/actions/save-contact.action";

interface ReviewStepProps {
	imageUrl: string;
	data: ContactData;
	onSave: () => void;
	onRetry: () => void;
}

const FIELDS = [
	{ key: "name", translationKey: "name" },
	{ key: "title", translationKey: "title_field" },
	{ key: "company", translationKey: "company" },
	{ key: "email", translationKey: "email" },
	{ key: "phone", translationKey: "phone" },
	{ key: "website", translationKey: "website" },
	{ key: "address", translationKey: "address" },
] as const;

export function ReviewStep({ imageUrl, data, onSave, onRetry }: ReviewStepProps) {
	const t = useTranslations("scanner.review");
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState<ContactData>(data);
	const { execute, isPending } = useAction(saveContact, {
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["contacts"] });
			toast.success(t("saved_toast"));
			onSave();
		},
		onError: ({ error }) => {
			toast.error(error.serverError ?? "Erreur lors de la sauvegarde");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		execute({ ...formData, imageUrl });
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4 py-6 px-4">
			<h1 className="text-2xl font-black tracking-tight">{t("title")}</h1>

			{imageUrl && (
				<div className="w-24 h-16 rounded-lg overflow-hidden border border-border self-center">
					<img src={imageUrl} alt="carte" className="w-full h-full object-cover" />
				</div>
			)}

			<div className="flex flex-col gap-3">
				{FIELDS.map(({ key, translationKey }) => (
					<div key={key} className="flex flex-col gap-1">
						<label htmlFor={key} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{t(translationKey)}
						</label>
						<Input
							id={key}
							type="text"
							value={formData[key]}
							onChange={(e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }))}
							className="bg-background h-10 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					</div>
				))}
			</div>

			<div className="flex gap-3 mt-2">
				<Button type="button" variant="outline" className="flex-1" onClick={onRetry}>
					{t("retry_btn")}
				</Button>
				<Button type="submit" variant="default" className="flex-1" disabled={isPending}>
					{t("save_btn")}
				</Button>
			</div>
		</form>
	);
}
