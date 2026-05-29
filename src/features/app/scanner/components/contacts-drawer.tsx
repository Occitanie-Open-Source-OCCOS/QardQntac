"use client";

import { useQuery } from "@tanstack/react-query";
import { SettingsIcon, UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import type { UserCarddavConfig } from "@/db/schemas/contacts";
import { listContacts } from "../actions/list-contacts.action";
import { CarddavConfigForm } from "./carddav-config-form";
import { ContactItem } from "./contact-item";

interface ContactsDrawerProps {
	carddavConfig: UserCarddavConfig | null;
}

export function ContactsDrawer({ carddavConfig: initialConfig }: ContactsDrawerProps) {
	const t = useTranslations("scanner.drawer");
	const [open, setOpen] = useState(false);
	const [showCarddavForm, setShowCarddavForm] = useState(false);
	const [carddavConfig, setCarddavConfig] = useState(initialConfig);

	const { data: contacts = [], refetch } = useQuery({
		queryKey: ["contacts"],
		queryFn: async () => {
			const result = await listContacts();
			return result?.data ?? [];
		},
		enabled: open,
	});

	const carddavConfigured = !!carddavConfig;

	return (
		<>
			<Button
				size="icon"
				variant="outline"
				className={`fixed top-4 right-4 z-50 shadow-md border-primary`}
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
						<div className="flex gap-2">
							<Button
								size="icon-xs"
								variant="ghost"
								onClick={() => setShowCarddavForm((v) => !v)}
								title={t("configure_carddav")}
								className={"text-primary"}
							>
								<SettingsIcon className="size-4" />
							</Button>
						</div>
					</DrawerHeader>

					<div className="px-4 pb-8 overflow-y-auto">
						{showCarddavForm && (
							<div className="mb-4 p-4 rounded-xl bg-muted border border-border">
								<CarddavConfigForm
									initial={carddavConfig}
									onSaved={() => {
										setShowCarddavForm(false);
										setCarddavConfig(
											(prev) =>
												prev ?? {
													userId: "",
													url: "",
													username: "",
													password: "",
													createdAt: new Date(),
													updatedAt: new Date(),
												},
										);
									}}
								/>
							</div>
						)}

						{contacts.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-8">{t("empty")}</p>
						) : (
							contacts.map((contact) => (
								<ContactItem
									key={contact.id}
									contact={contact}
									carddavConfigured={carddavConfigured}
									onMutated={refetch}
								/>
							))
						)}
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}
