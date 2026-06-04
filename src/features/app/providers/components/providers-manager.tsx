"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ProviderSummary } from "@/db/schemas/contacts";
import { deleteProvider } from "../actions/delete-provider.action";
import { ProviderForm } from "./provider-form";

interface ProvidersManagerProps {
	providers: ProviderSummary[];
	onMutated: () => void;
}

export function ProvidersManager({ providers, onMutated }: ProvidersManagerProps) {
	const t = useTranslations("providers");
	const [editingId, setEditingId] = useState<string | "new" | null>(null);

	const { execute: execDelete } = useAction(deleteProvider, {
		onSuccess: () => {
			toast.success(t("deleted_toast"));
			onMutated();
		},
	});

	const editing = editingId === "new" ? null : (providers.find((p) => p.id === editingId) ?? null);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<p className="text-sm font-semibold">{t("title")}</p>
				<Button size="icon-xs" variant="ghost" onClick={() => setEditingId("new")} title={t("add_btn")}>
					<PlusIcon className="size-3.5" />
				</Button>
			</div>

			{editingId !== null && (
				<div className="p-3 rounded-xl bg-muted border border-border">
					<ProviderForm
						initial={editing}
						onSaved={() => {
							setEditingId(null);
							onMutated();
						}}
						onCancel={() => setEditingId(null)}
					/>
				</div>
			)}

			{providers.length === 0 && editingId === null && (
				<p className="text-xs text-muted-foreground text-center py-2">{t("no_providers")}</p>
			)}

			{providers.map((p) => (
				<div key={p.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium truncate">{p.label}</p>
						<p className="text-xs text-muted-foreground capitalize">{p.type}</p>
					</div>
					<Button size="icon-xs" variant="ghost" onClick={() => setEditingId(p.id)} title={t("edit")}>
						<PencilIcon className="size-3.5" />
					</Button>
					<Button size="icon-xs" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => execDelete({ id: p.id })} title={t("delete")}>
						<Trash2Icon className="size-3.5" />
					</Button>
				</div>
			))}
		</div>
	);
}
