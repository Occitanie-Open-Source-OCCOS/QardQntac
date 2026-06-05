import type { Metadata } from "next";
import { AuthPortal } from "@/features/auth/components/auth-portal";
import { isWhitelisted } from "@/lib/restrictions";

export const metadata: Metadata = {
  title: "Authentification | KardKntact",
  description:
    "KardQntact is a contact management application designed to help you organize and manage your contacts efficiently. With QardQntac, you can easily add, edit, and categorize your contacts, making it easier to stay connected with friends, family, and colleagues.",
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
