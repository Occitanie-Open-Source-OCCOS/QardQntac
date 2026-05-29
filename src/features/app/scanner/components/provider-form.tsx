"use client";

import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProviderSummary } from "@/db/schemas/contacts";
import type { ProviderType } from "@/lib/carddav";
import { saveProvider } from "../actions/save-provider.action";
import { testProviderConnection } from "../actions/test-provider-connection.action";

const PROVIDER_META: Record<ProviderType, { name: string; urlPlaceholder: string; urlHint: string }> = {
	radicale: {
		name: "Radicale",
		urlPlaceholder: "http://host:5232/user/contacts/",
		urlHint: "Radicale tourne généralement sur le port 5232",
	},
	baikal: {
		name: "Baikal",
		urlPlaceholder: "http://host/baikal/dav.php/addressbooks/user/default/",
		urlHint: "URL de votre instance Baikal (dav.php/addressbooks/…)",
	},
	custom: {
		name: "Personnalisé",
		urlPlaceholder: "https://carddav.example.com/addressbooks/user/contacts/",
		urlHint: "URL complète du carnet d'adresses CardDAV",
	},
};

interface ProviderFormProps {
	initial?: ProviderSummary | null;
	onSaved: () => void;
	onCancel: () => void;
}

export function ProviderForm({ initial, onSaved, onCancel }: ProviderFormProps) {
	const t = useTranslations("scanner.providers");
	const [providerType, setProviderType] = useState<ProviderType>((initial?.type as ProviderType) ?? "radicale");
	const [label, setLabel] = useState(initial?.label ?? "");
	const [url, setUrl] = useState(initial?.url ?? "");
	const [username, setUsername] = useState(initial?.username ?? "");
	const [password, setPassword] = useState("");

	const meta = PROVIDER_META[providerType];

	const { execute: execSave, isPending: isSaving } = useAction(saveProvider, {
		onSuccess: () => {
			toast.success(t("saved_toast"));
			onSaved();
		},
		onError: ({ error }) => toast.error(error.serverError ?? "Erreur"),
	});

	const { execute: execTest, isPending: isTesting } = useAction(testProviderConnection, {
		onSuccess: () => toast.success(t("test_success")),
		onError: ({ error }) => toast.error(`${t("test_failed")}: ${error.serverError ?? "Erreur réseau"}`),
	});

	const canTest = !!url && !!username && !!password;
	const canSave = !!label && !!url && !!username && (!!initial || !!password);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				execSave({ id: initial?.id, type: providerType, label, url, username, password: password || undefined });
			}}
			className="flex flex-col gap-3"
		>
			<div className="flex gap-1">
				{(["radicale", "baikal", "custom"] as ProviderType[]).map((pt) => (
					<button
						key={pt}
						type="button"
						onClick={() => setProviderType(pt)}
						className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
							providerType === pt
								? "bg-primary text-primary-foreground border-primary"
								: "bg-background text-muted-foreground border-border hover:border-primary"
						}`}
					>
						{PROVIDER_META[pt].name}
					</button>
				))}
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("label")}</label>
				<Input
					type="text"
					value={label}
					onChange={(e) => setLabel(e.target.value)}
					placeholder={meta.name}
					className="bg-background h-10 px-3 py-2 text-sm"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL</label>
				<Input
					type="url"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder={meta.urlPlaceholder}
					className="bg-background h-10 px-3 py-2 text-sm"
				/>
				<p className="text-xs text-muted-foreground">{meta.urlHint}</p>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("username")}</label>
				<Input
					type="text"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					className="bg-background h-10 px-3 py-2 text-sm"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("password")}</label>
				<Input
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					placeholder={initial ? "••••••••" : ""}
					className="bg-background h-10 px-3 py-2 text-sm"
				/>
			</div>

			<div className="flex gap-2 mt-1">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={!canTest || isTesting}
					onClick={() => execTest({ type: providerType, url, username, password })}
					className="flex-1"
				>
					{isTesting ? "…" : t("test_btn")}
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
					{t("cancel_btn")}
				</Button>
				<Button type="submit" size="sm" disabled={!canSave || isSaving} className="flex-1">
					{t("save_btn")}
				</Button>
			</div>
		</form>
	);
}
