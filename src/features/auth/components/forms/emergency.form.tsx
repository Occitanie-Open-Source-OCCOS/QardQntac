"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useEmergencyAuth } from "@/features/auth/hooks/use-emergency-auth";
import { useZodForm } from "@/features/common/hooks/use-zod-form";
import { authSchema } from "../../schemas/auth.schema";

interface EmergencyFormProps {
	onBack: (email?: string) => void;
	onSent: (email: string) => void;
	callbackURL?: string;
	defaultValue?: string;
	onMutationStart?: () => void;
}

export function EmergencyForm({ onBack, onSent, callbackURL, defaultValue, onMutationStart }: EmergencyFormProps) {
	const t = useTranslations("auth.emergency");

	const form = useZodForm({
		schema: authSchema,
		defaultValues: { email: defaultValue || "" },
		mode: "onChange",
	});

	const { mutate: auth, isPending } = useEmergencyAuth(callbackURL, onSent);

	return (
		<div className="flex flex-col gap-10">
			<div>
				<img src="/assets/logo.svg" alt="QardQntac" className="h-10 w-auto" />
			</div>
			<div className="space-y-2">
				<h1 className="font-heading text-2xl font-bold tracking-tight">{t("title")}</h1>
				<p className="text-[#666666] text-lg font-medium">{t("description")}</p>
			</div>

			<Form
				form={form}
				className="space-y-10"
				onSubmit={(v) => {
					onMutationStart?.();
					auth(v);
				}}
			>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormControl>
								<Input
									placeholder="Adresse mail"
									{...field}
									className="h-14 bg-white px-4 text-lg placeholder:text-zinc-400"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="pt-2">
					<Button
						type="submit"
						variant="default"
						disabled={isPending}
						className="h-14 px-12 w-full text-lg font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
						{t("submit")}
					</Button>
				</div>
			</Form>

			<div className="flex justify-center pt-2">
				<button
					type="button"
					onClick={() => onBack(form.getValues("email"))}
					className="text-zinc-500 hover:text-black text-base transition-colors font-medium border-b border-transparent hover:border-black cursor-pointer"
				>
					{t("back")}
				</button>
			</div>
		</div>
	);
}
