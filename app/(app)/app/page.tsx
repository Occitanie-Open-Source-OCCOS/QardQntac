import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { userCarddavConfig } from "@/db/schemas";
import { ScannerWizard } from "@/features/app/scanner/components/scanner-wizard";
import authServer from "@/lib/auth/server";
import { db } from "@/lib/db";

export default async function App() {
	const session = await authServer.api.getSession({ headers: await headers() });
	if (!session) return null;
	const userId = session.user.id;

	const [carddavConfig] = await db.select().from(userCarddavConfig).where(eq(userCarddavConfig.userId, userId));

	return <ScannerWizard carddavConfig={carddavConfig ?? null} />;
}
