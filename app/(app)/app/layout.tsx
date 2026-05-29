import { Dashboard } from "@/features/app/layouts/dashboard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
	return <Dashboard>{children}</Dashboard>;
}
