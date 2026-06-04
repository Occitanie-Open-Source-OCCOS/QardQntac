// src/features/app/layouts/app-header.tsx
"use client";

import { useTransition } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import authClient from "@/lib/auth/client";

export function AppHeader() {
	const t = useTranslations("app.header");
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const [isPending, startTransition] = useTransition();

	const name = session?.user.name ?? "";
	const email = session?.user.email ?? "";
	const initials = name
		? name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: email.slice(0, 2).toUpperCase();

	const handleSignOut = () => {
		startTransition(async () => {
			try {
				await authClient.signOut();
				router.push("/portal");
			} catch (error) {
				console.error("Sign out failed:", error);
			}
		});
	};

	return (
		<header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
			<span className="text-base font-bold tracking-tight">Kardqntact</span>

			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<button
							type="button"
							className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					}
				>
					{initials}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					{email && (
						<>
							<div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{email}</div>
							<DropdownMenuSeparator />
						</>
					)}
					<DropdownMenuItem
						onClick={handleSignOut}
						disabled={isPending}
						className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
					>
						{isPending ? "…" : t("sign_out")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</header>
	);
}
