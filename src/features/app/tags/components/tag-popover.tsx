// src/features/app/tags/components/tag-popover.tsx
"use client";

import { CheckIcon, PencilIcon, TagIcon, Trash2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Tag } from "@/db/schemas/contacts";
import { assignTags } from "../actions/assign-tags.action";
import { createTag } from "../actions/create-tag.action";
import { deleteTag } from "../actions/delete-tag.action";
import { updateTag } from "../actions/update-tag.action";

const PALETTE = [
	"#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
	"#f97316", "#f59e0b", "#eab308", "#84cc16",
	"#22c55e", "#10b981", "#14b8a6", "#06b6d4",
	"#3b82f6", "#0ea5e9", "#64748b", "#1e293b",
];

interface TagPopoverProps {
	contactId: number;
	assignedTagIds: string[];
	allTags: Tag[];
	onMutated: () => void;
}

export function TagPopover({ contactId, assignedTagIds, allTags, onMutated }: TagPopoverProps) {
	const t = useTranslations("tags");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [showCreate, setShowCreate] = useState(false);
	const [newName, setNewName] = useState("");
	const [newColor, setNewColor] = useState(PALETTE[0]);

	const { execute: execAssign } = useAction(assignTags, {
		onSuccess: onMutated,
		onError: ({ error }) => toast.error(error.serverError ?? "Erreur"),
	});

	const { execute: execCreate, isPending: isCreating } = useAction(createTag, {
		onSuccess: ({ data }) => {
			if (data) {
				execAssign({ contactId, tagIds: [...assignedTagIds, data.id] });
			}
			toast.success(t("created_toast"));
			setShowCreate(false);
			setNewName("");
			setNewColor(PALETTE[0]);
		},
		onError: ({ error }) => toast.error(error.serverError ?? "Erreur"),
	});

	const { execute: execUpdate } = useAction(updateTag, {
		onSuccess: () => {
			toast.success(t("updated_toast"));
			setEditingId(null);
			onMutated();
		},
		onError: ({ error }) => toast.error(error.serverError ?? "Erreur"),
	});

	const { execute: execDelete } = useAction(deleteTag, {
		onSuccess: () => {
			toast.success(t("deleted_toast"));
			onMutated();
		},
		onError: ({ error }) => toast.error(error.serverError ?? "Erreur"),
	});

	const toggleAssign = (tagId: string) => {
		const next = assignedTagIds.includes(tagId)
			? assignedTagIds.filter((id) => id !== tagId)
			: [...assignedTagIds, tagId];
		execAssign({ contactId, tagIds: next });
	};

	return (
		<Popover>
			<PopoverTrigger
				render={
					<button
						type="button"
						className="inline-flex items-center justify-center size-[18px] rounded hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
					/>
				}
				title={t("assign_tags")}
			>
				<TagIcon className="size-3" />
			</PopoverTrigger>

			<PopoverContent className="w-52 p-2" side="bottom" align="end">
				<div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
					{allTags.length === 0 && !showCreate && (
						<p className="text-xs text-muted-foreground text-center py-2">{t("no_tags")}</p>
					)}

					{allTags.map((tag) =>
						editingId === tag.id ? (
							<div key={tag.id} className="flex gap-1 items-center">
								<Input
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									className="h-7 text-xs flex-1"
									autoFocus
								/>
								<button
									type="button"
									onClick={() => editName.trim() && execUpdate({ id: tag.id, name: editName.trim() })}
									className="p-1 text-green-600 hover:bg-green-50 rounded"
								>
									<CheckIcon className="size-3" />
								</button>
								<button
									type="button"
									onClick={() => setEditingId(null)}
									className="p-1 text-muted-foreground hover:bg-muted rounded"
								>
									<XIcon className="size-3" />
								</button>
							</div>
						) : (
							<div key={tag.id} className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-muted group">
								<button
									type="button"
									onClick={() => toggleAssign(tag.id)}
									className="flex items-center gap-1.5 flex-1 text-left"
								>
									<span
										className="size-3 rounded-full shrink-0 border border-black/10"
										style={{ backgroundColor: tag.color }}
									/>
									<span className="text-xs truncate">{tag.name}</span>
									{assignedTagIds.includes(tag.id) && (
										<CheckIcon className="size-3 text-primary ml-auto shrink-0" />
									)}
								</button>
								<button
									type="button"
									onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}
									className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-foreground rounded"
								>
									<PencilIcon className="size-2.5" />
								</button>
								<button
									type="button"
									onClick={() => execDelete({ id: tag.id })}
									className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600 rounded"
								>
									<Trash2Icon className="size-2.5" />
								</button>
							</div>
						),
					)}
				</div>

				{showCreate ? (
					<div className="mt-2 pt-2 border-t border-border flex flex-col gap-2">
						<Input
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							placeholder={t("name_placeholder")}
							className="h-7 text-xs"
							autoFocus
						/>
						<div className="flex flex-wrap gap-1">
							{PALETTE.map((c) => (
								<button
									key={c}
									type="button"
									onClick={() => setNewColor(c)}
									className="size-5 rounded-full border-2 transition-all"
									style={{
										backgroundColor: c,
										borderColor: newColor === c ? "#000" : "transparent",
									}}
								/>
							))}
						</div>
						<div className="flex gap-1">
							<Button
								size="sm"
								className="flex-1 h-7 text-xs"
								disabled={!newName.trim() || isCreating}
								onClick={() => execCreate({ name: newName.trim(), color: newColor })}
							>
								{t("create")}
							</Button>
							<Button
								size="sm"
								variant="ghost"
								className="h-7 text-xs"
								onClick={() => { setShowCreate(false); setNewName(""); }}
							>
								<XIcon className="size-3" />
							</Button>
						</div>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setShowCreate(true)}
						className="mt-2 pt-2 border-t border-border w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						+ {t("new_tag")}
					</button>
				)}
			</PopoverContent>
		</Popover>
	);
}
