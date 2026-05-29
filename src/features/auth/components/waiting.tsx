"use client";

import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useEmergencyAuth } from "@/features/auth/hooks/use-emergency-auth";

interface WaitingProps {
	email: string;
	onBack: () => void;
	callbackURL?: string;
	isEmergency?: boolean;
}

export function Waiting({ email, onBack, callbackURL, isEmergency }: WaitingProps) {
	const t = useTranslations("auth.waiting");
	const [countdown, setCountdown] = useState(30);

	const { mutate: auth, isPending: isAuthPending } = useAuth(callbackURL, () => {
		setCountdown(30);
	});

	const { mutate: emergencyAuth, isPending: isEmergencyPending } = useEmergencyAuth(callbackURL, () => {
		setCountdown(30);
	});

	const isPending = isAuthPending || isEmergencyPending;

	useEffect(() => {
		if (countdown > 0) {
			const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
			return () => clearTimeout(timer);
		}
	}, [countdown]);

	const handleResend = () => {
		if (countdown > 0 || isPending) return;
		if (isEmergency) {
			emergencyAuth({ email });
		} else {
			auth({ email });
		}
	};

	return (
		<div className="flex flex-col gap-10">
			<div>
				<h1 className="font-heading text-3xl font-bold tracking-tight">KardQntact</h1>{" "}
			</div>

			<div className="flex flex-col gap-4">
				<div>
					<h1 className="font-heading text-xl font-bold tracking-tight">
						{isEmergency ? t("title_emergency") : t("title_standard")}
					</h1>
					<p className="text-[#666666] text-lg">
						{isEmergency ? t("description_emergency", { email }) : t("description_standard", { email })}
					</p>
				</div>

				<div className="bg-zinc-50 p-6 border border-zinc-100 space-y-4">
					<p className="text-sm text-zinc-500 font-medium">{isEmergency ? t("help_emergency") : t("help_standard")}</p>

					<Button
						onClick={handleResend}
						disabled={countdown > 0 || isPending}
						variant="outline"
						className="h-12 w-full border-zinc-200 bg-white text-base font-bold text-black hover:bg-zinc-50 transition-all gap-2"
					>
						{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
						{countdown > 0 ? t("resend_countdown", { seconds: countdown }) : t("resend")}
					</Button>
				</div>
			</div>

			<div className="flex justify-center pt-2">
				<Button
					variant="link"
					onClick={onBack}
					className="flex items-center gap-2 text-zinc-500 hover:text-black text-base transition-colors font-medium border-none hover:border-black cursor-pointer"
				>
					<ArrowLeft className="h-4 w-4" />
					{t("change_email")}
				</Button>
			</div>
		</div>
	);
}
