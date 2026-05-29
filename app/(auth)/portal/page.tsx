import type { Metadata } from "next";
import { AuthPortal } from "@/features/auth/components/auth-portal";
import { isWhitelisted } from "@/lib/restrictions";

export const metadata: Metadata = {
	title: "Connexion | KardKntact",
	description: "Connectez-vous à KardKntact.",
};

export default async function AuthPage(props: {
	searchParams: Promise<{
		redirect_to: string;
		email?: string;
		authentificationType?: string;
	}>;
}) {
	const { redirect_to, email, authentificationType } = await props.searchParams;

	const validEmail = email && isWhitelisted(email) ? email : undefined;

	return (
		<AuthPortal
			callbackURL={redirect_to}
			initialEmail={validEmail}
			prefilledEmail={email}
			authType={authentificationType}
		/>
	);
}
