"use client";

import { useQuery } from "@tanstack/react-query";
import { SettingsIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import type { ProviderSummary } from "@/db/schemas/contacts";
import { listContacts } from "../actions/list-contacts.action";
import { listProviders } from "../actions/list-providers.action";
import { ContactItem } from "./contact-item";
import { ProvidersManager } from "./providers-manager";

export function ContactsDrawer() {
	const t = useTranslations("scanner.drawer");
	const [open, setOpen] = useState(false);
	const [showProviders, setShowProviders] = useState(false);

	const { data: contacts = [], refetch: refetchContacts } = useQuery({
		queryKey: ["contacts"],
		queryFn: async () => {
			const result = await listContacts();
			return result?.data ?? [];
		},
		enabled: open,
	});

	const { data: providers = [], refetch: refetchProviders } = useQuery({
		queryKey: ["providers"],
		queryFn: async () => {
			const result = await listProviders();
			return (result?.data ?? []) as ProviderSummary[];
		},
		enabled: open,
	});

	return (
		<>
			<Button
				size="icon"
				variant="outline"
				className="fixed top-4 right-4 z-50 shadow-md border-primary"
				onClick={() => setOpen(true)}
				title={t("title")}
			>
				<UsersIcon className="size-4" />
				{contacts.length > 0 && (
					<span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
						{contacts.length > 99 ? "99+" : contacts.length}
					</span>
				)}
			</Button>

			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerTrigger className="hidden" />
				<DrawerContent className="max-h-[85vh]">
					<DrawerHeader className="flex flex-row items-center justify-between">
						<DrawerTitle>{t("title")}</DrawerTitle>
						<Button
							size="icon-xs"
							variant="ghost"
							onClick={() => setShowProviders((v) => !v)}
							title={t("configure_carddav")}
							className="text-primary"
						>
							<SettingsIcon className="size-4" />
						</Button>
					</DrawerHeader>

					<div className="px-4 pb-8 overflow-y-auto">
						{showProviders && (
							<div className="mb-4 p-4 rounded-xl bg-muted border border-border">
								<ProvidersManager
									providers={providers}
									onMutated={() => {
										refetchProviders();
										refetchContacts();
									}}
								/>
							</div>
						)}

						{contacts.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-8">{t("empty")}</p>
						) : (
							contacts.map((contact) => (
								<ContactItem key={contact.id} contact={contact} providers={providers} onMutated={refetchContacts} />
							))
						)}
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}
