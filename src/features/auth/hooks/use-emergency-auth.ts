"use client";

import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import { AuthSchemaType } from "../schemas/auth.schema";

export function useEmergencyAuth(
	callbackURL?: string,
	onSent?: (email: string) => void,
	onError?: (error: any) => void,
) {
	const t = useTranslations("auth.toast");

	return useMutation({
		mutationFn: async (values: AuthSchemaType) => {
			const { error } = await authClient.signIn.magicLink({
				email: values.email,
				callbackURL: callbackURL || "/",
				fetchOptions: {
					headers: {
						"x-emergency-login": "true",
					},
				},
			});

			if (error) {
				throw error;
			}
			return values.email;
		},
		onSuccess: (email) => {
			toast.success(t("check_console"));
			onSent?.(email);
		},
		onError: (error) => {
			toast.error(error.message || t("error_generic"));
			onError?.(error);
		},
	});
}
