"use client";

export function Dashboard({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col bg-background">
			<main className="flex-1 w-full max-w-420 mx-auto p-4 md:p-8">{children}</main>
		</div>
	);
}
