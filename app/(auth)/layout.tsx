import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/features/auth/layouts/auth";
import authServer from "@/lib/auth/server";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await authServer.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    redirect("/app");
  }

  return <AuthLayout>{children}</AuthLayout>;
}
