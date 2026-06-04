// src/features/app/scanner/components/steps/review-step.tsx
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tag } from "@/db/schemas/contacts";
import { assignTags } from "@/features/app/tags/actions/assign-tags.action";
import { listTags } from "@/features/app/tags/actions/list-tags.action";
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
	const tTags = useTranslations("tags");
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState<ContactData>(data);
	const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

	const { data: allTags = [] } = useQuery({
		queryKey: ["tags"],
		queryFn: async () => {
			const result = await listTags();
			return (result?.data ?? []) as Tag[];
		},
	});

	const { execute, isPending } = useAction(saveContact, {
		onSuccess: async ({ data: saveData }) => {
			if (saveData?.id && selectedTagIds.length > 0) {
				await assignTags({ contactId: saveData.id, tagIds: selectedTagIds });
				queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
			}
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

	const toggleTag = (id: string) => {
		setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((prevId) => prevId !== id) : [...prev, id]));
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

				{allTags.length > 0 && (
					<div className="flex flex-col gap-1">
						<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{tTags("tag_label")}
						</label>
						<div className="flex flex-wrap gap-1.5">
							{allTags.map((tag) => {
								const active = selectedTagIds.includes(tag.id);
								return (
									<button
										key={tag.id}
										type="button"
										onClick={() => toggleTag(tag.id)}
										className="px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
										style={{
											backgroundColor: active ? tag.color : `${tag.color}22`,
											color: active ? "#fff" : tag.color,
											borderColor: tag.color,
										}}
									>
										{tag.name}
									</button>
								);
							})}
						</div>
					</div>
				)}
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
