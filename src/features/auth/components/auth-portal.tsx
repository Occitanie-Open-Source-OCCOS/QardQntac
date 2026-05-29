"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "../hooks/use-auth";
import { AuthForm } from "./forms/auth.form";
import { EmergencyForm } from "./forms/emergency.form";
import { Waiting } from "./waiting";

export type AuthView = "login" | "waiting" | "emergency";

export function AuthPortal({
	callbackURL,
	initialEmail,
	prefilledEmail,
	authType,
}: {
	callbackURL?: string;
	initialEmail?: string;
	prefilledEmail?: string;
	authType?: string;
}) {
	const t = useTranslations("auth.login");
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [view, setView] = useState<AuthView>(initialEmail && authType === "code" ? "waiting" : "login");
	const [email, setEmail] = useState(initialEmail || prefilledEmail || "");
	const [isEmergency, setIsEmergency] = useState(false);
	const hasInitiatedSend = useRef(false);
	const hasErrorShown = useRef(false);

	const updateURL = (e: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("email", e);
		params.set("authentificationType", "code");
		router.replace(`${pathname}?${params.toString()}`);
	};

	const clearURL = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("email");
		params.delete("authentificationType");
		const query = params.toString();
		router.replace(query ? `${pathname}?${query}` : pathname);
	};

	const { mutate: auth } = useAuth(
		callbackURL,
		(e) => {
			setEmail(e);
			setIsEmergency(false);
			setView("waiting");
			updateURL(e);
		},
		() => {
			if (initialEmail) setView("login");
		},
	);

	useEffect(() => {
		if (initialEmail && authType === "code" && !hasInitiatedSend.current) {
			hasInitiatedSend.current = true;
			auth({ email: initialEmail });
		} else if (!initialEmail && prefilledEmail && authType === "code" && !hasErrorShown.current) {
			hasErrorShown.current = true;
			toast.error(t("error_only_employees"));
			clearURL();
		}
	}, [initialEmail, auth, authType, prefilledEmail, t]);

	const onManualSend = () => {
		hasInitiatedSend.current = true;
	};

	return (
		<Tabs value={view} onValueChange={(v) => setView(v as AuthView)} className="w-full">
			<TabsContent value="login">
				<AuthForm
					callbackURL={callbackURL}
					defaultValue={email}
					onSent={(e) => {
						setEmail(e);
						setIsEmergency(false);
						setView("waiting");
						updateURL(e);
					}}
					onEmergency={(e) => {
						if (e) setEmail(e);
						setView("emergency");
					}}
					onMutationStart={onManualSend}
				/>
			</TabsContent>
			<TabsContent value="waiting">
				<Waiting
					email={email}
					isEmergency={isEmergency}
					onBack={() => {
						clearURL();
						setView("login");
					}}
					callbackURL={callbackURL}
				/>
			</TabsContent>
			<TabsContent value="emergency">
				<EmergencyForm
					callbackURL={callbackURL}
					defaultValue={email}
					onBack={(e) => {
						if (e) setEmail(e);
						setView("login");
					}}
					onSent={(e) => {
						setEmail(e);
						setIsEmergency(true);
						setView("waiting");
						updateURL(e);
					}}
					onMutationStart={onManualSend}
				/>
			</TabsContent>
		</Tabs>
	);
}
