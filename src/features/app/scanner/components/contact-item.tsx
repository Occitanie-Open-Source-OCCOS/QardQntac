"use client";

import { DownloadIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Contact } from "@/db/schemas/contacts";
import { downloadVCard } from "@/lib/vcf";
import { deleteContact } from "../actions/delete-contact.action";
import { syncContact } from "../actions/sync-contact.action";

interface ContactItemProps {
	contact: Contact;
	carddavConfigured: boolean;
	onMutated: () => void;
}

export function ContactItem({ contact, carddavConfigured, onMutated }: ContactItemProps) {
	const t = useTranslations("scanner.drawer");
	const tErrors = useTranslations("scanner.errors");

	const { execute: execDelete, isPending: isDeleting } = useAction(deleteContact, {
		onSuccess: onMutated,
		onError: () => toast.error(tErrors("delete_failed")),
	});

	const { execute: execSync, isPending: isSyncing } = useAction(syncContact, {
		onSuccess: () => {
			toast.success(t("synced_label"));
			onMutated();
		},
		onError: ({ error }) => toast.error(error.serverError ?? tErrors("sync_failed")),
	});

	const initials = contact.name
		? contact.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "?";

	return (
		<div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
			<div className="size-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
				{initials}
			</div>
			<div className="flex-1 min-w-0">
				<p className="font-medium text-sm truncate">{contact.name || "—"}</p>
				<p className="text-xs text-muted-foreground truncate">{contact.company || contact.email || ""}</p>
				{contact.syncedAt && <p className="text-xs text-green-600">{t("synced_label")}</p>}
			</div>
			<div className="flex gap-1 shrink-0">
				<Button size="icon-xs" variant="ghost" onClick={() => downloadVCard(contact)} title={t("download_vcf")}>
					<DownloadIcon className="size-3.5" />
				</Button>
				<Button
					size="icon-xs"
					variant="ghost"
					disabled={!carddavConfigured || isSyncing}
					onClick={() => execSync({ id: contact.id })}
					title={carddavConfigured ? t("sync_radicale") : tErrors("carddav_not_configured")}
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
	);
}
