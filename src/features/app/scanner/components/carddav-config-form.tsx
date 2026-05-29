"use client";

import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserCarddavConfig } from "@/db/schemas/contacts";
import { saveCarddavConfig } from "../actions/save-carddav.action";

interface CarddavConfigFormProps {
	initial?: UserCarddavConfig | null;
	onSaved: () => void;
}

export function CarddavConfigForm({ initial, onSaved }: CarddavConfigFormProps) {
	const t = useTranslations("scanner.carddav");
	const [url, setUrl] = useState(initial?.url ?? "");
	const [username, setUsername] = useState(initial?.username ?? "");
	const [password, setPassword] = useState(initial?.password ?? "");

	const { execute, isPending } = useAction(saveCarddavConfig, {
		onSuccess: () => {
			toast.success(t("saved_toast"));
			onSaved();
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				execute({ url, username, password });
			}}
			className="flex flex-col gap-3 pt-2"
		>
			<p className="text-sm font-semibold">{t("title")}</p>
			{(
				[
					{ label: t("url"), value: url, set: setUrl, type: "url", placeholder: t("url_placeholder") },
					{ label: t("username"), value: username, set: setUsername, type: "text", placeholder: "" },
					{ label: t("password"), value: password, set: setPassword, type: "password", placeholder: "" },
				] as const
			).map(({ label, value, set, type, placeholder }) => (
				<div key={label} className="flex flex-col gap-1">
					<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
					<Input
						type={type}
						value={value}
						onChange={(e) => set(e.target.value)}
						placeholder={placeholder}
						className="bg-background h-10 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
				</div>
			))}
			<Button type="submit" size="sm" disabled={isPending || !url || !username || !password}>
				{t("save_btn")}
			</Button>
		</form>
	);
}
