// src/features/app/contacts/components/contact-card.tsx
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

const AVATAR_COLORS = [
	"bg-violet-500",
	"bg-emerald-500",
	"bg-amber-500",
	"bg-rose-500",
	"bg-sky-500",
	"bg-orange-500",
];

function getAvatarColor(name: string): string {
	const index = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
	return AVATAR_COLORS[index];
}

interface ContactCardProps {
	contact: Contact;
	providers: ProviderSummary[];
	onMutated: () => void;
}

export function ContactCard({ contact, providers, onMutated }: ContactCardProps) {
	const t = useTranslations("contacts.card");
	const tErrors = useTranslations("contacts.errors");
	const tProviders = useTranslations("providers");
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

	const avatarColor = getAvatarColor(contact.name || "?");
	const syncedProvider = providers.find((p) => p.id === contact.providerId);
	const subtitle = contact.company || contact.email || "";

	return (
		<div className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-2 text-center">
			<div className={`size-12 rounded-full ${avatarColor} text-white flex items-center justify-center text-sm font-bold shrink-0`}>
				{initials}
			</div>

			<div className="w-full min-w-0">
				<p className="font-semibold text-sm truncate">{contact.name || "—"}</p>
				{subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
				{syncedProvider && (
					<p className="text-xs text-green-600 truncate">
						✓ {t("synced_label")} · {syncedProvider.label}
					</p>
				)}
			</div>

			<div className="flex gap-1">
				<Button size="icon-xs" variant="ghost" onClick={() => downloadVCard(contact)} title={t("download_vcf")}>
					<DownloadIcon className="size-3.5" />
				</Button>
				<Button size="icon-xs" variant="ghost" disabled={isSyncing} onClick={handleSyncClick} title={t("sync")}>
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

			{showPicker && (
				<div className="w-full flex flex-col gap-1 pt-1 border-t border-border">
					<p className="text-xs text-muted-foreground">{tProviders("pick_provider")}</p>
					{providers.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => execSync({ id: contact.id, providerId: p.id })}
							disabled={isSyncing}
							className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors flex items-center justify-between"
						>
							<span>{p.label}</span>
							<span className="text-muted-foreground capitalize">{p.type}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
