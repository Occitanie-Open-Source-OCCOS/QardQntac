"use client";

import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { saveProvider } from "@/features/app/providers/actions/save-provider.action";
import { testProviderConnection } from "@/features/app/providers/actions/test-provider-connection.action";
import { providerSchema } from "@/features/app/providers/schemas/provider.schema";
import type { ProviderSummary } from "@/db/schemas/contacts";
import { useZodForm } from "@/features/common/hooks/use-zod-form";
import { PROVIDER_TYPES, type ProviderType } from "@/lib/carddav";

interface ProviderFormProps {
	initial?: ProviderSummary | null;
	onSaved: () => void;
	onCancel: () => void;
}

export function ProviderForm({ initial, onSaved, onCancel }: ProviderFormProps) {
	const t = useTranslations("scanner.providers");

	const form = useZodForm({
		schema: providerSchema,
		defaultValues: {
			id: initial?.id,
			type: (initial?.type as ProviderType) ?? "radicale",
			label: initial?.label ?? "",
			url: initial?.url ?? "",
			username: initial?.username ?? "",
			password: "",
		},
		mode: "onChange",
	});

	const providerType = form.watch("type") as ProviderType;

	const { execute: execSave, isPending: isSaving } = useAction(saveProvider, {
		onSuccess: () => {
			toast.success(t("saved_toast"));
			onSaved();
		},
		onError: ({ error }) => toast.error(error.serverError ?? t("error_generic")),
	});

	const { execute: execTest, isPending: isTesting } = useAction(testProviderConnection, {
		onSuccess: () => toast.success(t("test_success")),
		onError: ({ error }) => toast.error(`${t("test_failed")}: ${error.serverError ?? t("error_network")}`),
	});

	const values = form.watch();
	const canTest = !!values.url && !!values.username && !!values.password;

	return (
		<Form
			form={form}
			className="flex flex-col gap-3"
			onSubmit={(v) => execSave({ ...v, password: v.password || undefined })}
		>
			<FormField
				control={form.control}
				name="type"
				render={({ field }) => (
					<FormItem className="space-y-1">
						<div className="flex flex-col md:flex-row gap-1">
							{PROVIDER_TYPES.map((pt) => (
								<button
									key={pt}
									type="button"
									onClick={() => field.onChange(pt)}
									className={`flex-1 py-1.5 text-xs font-medium rounded-lg border capitalize transition-colors ${
										field.value === pt
											? "bg-primary text-primary-foreground border-primary"
											: "bg-background text-muted-foreground border-border hover:border-primary"
									}`}
								>
									{pt}
								</button>
							))}
						</div>
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="label"
				render={({ field }) => (
					<FormItem className="space-y-1">
						<FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{t("label")}
						</FormLabel>
						<FormControl>
							<Input type="text" className="bg-background h-10 px-3 py-2 text-sm" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="url"
				render={({ field }) => (
					<FormItem className="space-y-1">
						<FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">URL</FormLabel>
						<FormControl>
							<Input type="url" className="bg-background h-10 px-3 py-2 text-sm" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="username"
				render={({ field }) => (
					<FormItem className="space-y-1">
						<FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{t("username")}
						</FormLabel>
						<FormControl>
							<Input type="text" className="bg-background h-10 px-3 py-2 text-sm" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="password"
				render={({ field }) => (
					<FormItem className="space-y-1">
						<FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{t("password")}
						</FormLabel>
						<FormControl>
							<Input
								type="password"
								placeholder={initial ? "••••••••" : ""}
								className="bg-background h-10 px-3 py-2 text-sm"
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="flex flex-col md:flex-row gap-2 mt-1">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={!canTest || isTesting}
					onClick={() =>
						execTest({
							type: providerType,
							url: values.url,
							username: values.username,
							password: values.password ?? "",
						})
					}
				>
					{isTesting ? "…" : t("test_btn")}
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
					{t("cancel_btn")}
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={!form.formState.isValid || (!initial && !values.password) || isSaving}
				>
					{t("save_btn")}
				</Button>
			</div>
		</Form>
	);
}
