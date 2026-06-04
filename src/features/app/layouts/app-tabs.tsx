// src/features/app/layouts/app-tabs.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Contact } from "@/db/schemas/contacts";
import { listContacts } from "@/features/app/contacts/actions/list-contacts.action";
import { ContactsGrid } from "@/features/app/contacts/components/contacts-grid";
import { ScannerWizard } from "@/features/app/scanner/components/scanner-wizard";
import { AppHeader } from "./app-header";

type Tab = "scanner" | "contacts";

export function AppTabs() {
	const t = useTranslations("app.tabs");
	const [activeTab, setActiveTab] = useState<Tab>("scanner");

	const { data: contacts = [], refetch: refetchContacts } = useQuery({
		queryKey: ["contacts"],
		queryFn: async () => {
			const result = await listContacts();
			return (result?.data ?? []) as Contact[];
		},
	});

	return (
		<div className="flex flex-col min-h-screen bg-background">
			<AppHeader />

			<div className="sticky top-[57px] z-40 bg-background border-b border-border px-4 py-2">
				<div className="flex gap-2 max-w-420 mx-auto">
					<button
						type="button"
						onClick={() => setActiveTab("scanner")}
						className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === "scanner"
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:text-foreground"
						}`}
					>
						{t("scanner")}
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("contacts")}
						className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
							activeTab === "contacts"
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:text-foreground"
						}`}
					>
						{t("contacts")}
						{contacts.length > 0 && (
							<span
								className={`absolute -top-1.5 -right-1.5 size-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
									activeTab === "contacts"
										? "bg-background text-primary"
										: "bg-primary text-primary-foreground"
								}`}
							>
								{contacts.length > 99 ? "99+" : contacts.length}
							</span>
						)}
					</button>
				</div>
			</div>

			<main className="flex-1 w-full max-w-420 mx-auto p-4">
				{activeTab === "scanner" && <ScannerWizard />}
				{activeTab === "contacts" && (
					<ContactsGrid contacts={contacts} onMutated={refetchContacts} />
				)}
			</main>
		</div>
	);
}
