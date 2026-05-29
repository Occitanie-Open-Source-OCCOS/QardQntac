"use client";

import { DownloadIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Contact, ProviderSummary } from "@/db/schemas/contacts";
import { downloadVCard } from "@/lib/vcf";
import { deleteContact } from "../actions/delete-contact.action";
import { syncContact } from "../actions/sync-contact.action";

interface ContactItemProps {
	contact: Contact;
	providers: ProviderSummary[];
	onMutated: () => void;
}

export function ContactItem({ contact, providers, onMutated }: ContactItemProps) {
	const t = useTranslations("scanner.drawer");
	const tProviders = useTranslations("scanner.providers");
	const tErrors = useTranslations("scanner.errors");
	const [showPicker, setShowPicker] = useState(false);

	const { execute: execDelete, isPending: isDeleting } = useAction(deleteContact, {
		onSuccess: onMutated,
		onError: () => toast.error(tErrors("delete_failed")),
	});

	const { execute: execSync, isPending: isSyncing } = useAction(syncContact, {
		onSuccess: () => {
			toast.success(t("synced_label"));
			setShowPicker(false);
			onMutated();
		},
		onError: ({ error }) => toast.error(error.serverError ?? tErrors("sync_failed")),
	});

	const handleSyncClick = () => {
		if (providers.length === 0) {
			toast.error(tErrors("no_providers_configured"));
			return;
		}
		if (providers.length === 1) {
			execSync({ id: contact.id, providerId: providers[0].id });
			return;
		}
		setShowPicker((v) => !v);
	};

	const initials = contact.name
		? contact.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "?";

	const syncedProvider = providers.find((p) => p.id === contact.providerId);

	return (
		<div className="border-b border-border last:border-0">
			<div className="flex items-center gap-3 py-3">
				<div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
					{initials}
				</div>
				<div className="flex-1 min-w-0">
					<p className="font-medium text-sm truncate">{contact.name || "—"}</p>
					<p className="text-xs text-muted-foreground truncate">{contact.company || contact.email || ""}</p>
					{syncedProvider && (
						<p className="text-xs text-green-600">
							{t("synced_label")} · {syncedProvider.label}
						</p>
					)}
				</div>
				<div className="flex gap-1 shrink-0">
					<Button size="icon-xs" variant="ghost" onClick={() => downloadVCard(contact)} title={t("download_vcf")}>
						<DownloadIcon className="size-3.5" />
					</Button>
					<Button
						size="icon-xs"
						variant="ghost"
						disabled={isSyncing}
						onClick={handleSyncClick}
						title={t("sync_radicale")}
					>
						<RefreshCwIcon className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
					</Button>
					<Button
						size="icon-xs"
						variant="ghost"
						disabled={isDeleting}
						onClick={() => execDelete({ id: contact.id })}
						title={t("delete")}
						className="text-red-500 hover:text-red-600"
					>
						<Trash2Icon className="size-3.5" />
					</Button>
				</div>
			</div>

			{showPicker && (
				<div className="pb-2 flex flex-col gap-1">
					<p className="text-xs text-muted-foreground px-1 mb-1">{tProviders("pick_provider")}</p>
					{providers.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => execSync({ id: contact.id, providerId: p.id })}
							disabled={isSyncing}
							className="text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors flex items-center justify-between"
						>
							<span>{p.label}</span>
							<span className="text-xs text-muted-foreground capitalize">{p.type}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
