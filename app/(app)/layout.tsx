export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-background flex flex-col">
			<div className="flex-1 flex flex-col">{children}</div>
		</div>
	);
}
