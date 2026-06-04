// src/features/app/contacts/components/contacts-grid.tsx
"use client";

import {
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Contact, ProviderSummary } from "@/db/schemas/contacts";
import { listProviders } from "@/features/app/providers/actions/list-providers.action";
import { ProvidersManager } from "@/features/app/providers/components/providers-manager";
import { ContactCard } from "./contact-card";

const columnHelper = createColumnHelper<Contact>();

const columns = [
	columnHelper.accessor("name", {}),
	columnHelper.accessor("company", {}),
	columnHelper.accessor("email", {}),
];

interface ContactsGridProps {
	contacts: Contact[];
	onMutated: () => void;
}

export function ContactsGrid({ contacts, onMutated }: ContactsGridProps) {
	const t = useTranslations("contacts.grid");
	const [globalFilter, setGlobalFilter] = useState("");
	const [showProviders, setShowProviders] = useState(false);

	const { data: providers = [], refetch: refetchProviders } = useQuery({
		queryKey: ["providers"],
		queryFn: async () => {
			const result = await listProviders();
			return (result?.data ?? []) as ProviderSummary[];
		},
	});

	const table = useReactTable({
		data: contacts,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: { globalFilter },
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: "includesString",
	});

	const rows = table.getRowModel().rows;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex gap-2 items-center">
				<Input
					placeholder={t("search_placeholder")}
					value={globalFilter}
					onChange={(e) => setGlobalFilter(e.target.value)}
					className="h-9 text-sm"
				/>
				<Button
					size="icon"
					variant="ghost"
					onClick={() => setShowProviders((v) => !v)}
					title={t("configure_providers")}
					className={showProviders ? "text-primary" : ""}
				>
					<SettingsIcon className="size-4" />
				</Button>
			</div>

			{showProviders && (
				<div className="p-4 rounded-xl bg-muted border border-border">
					<ProvidersManager
						providers={providers}
						onMutated={() => {
							refetchProviders();
							onMutated();
						}}
					/>
				</div>
			)}

			{contacts.length === 0 ? (
				<p className="text-sm text-muted-foreground text-center py-12">{t("empty")}</p>
			) : rows.length === 0 ? (
				<p className="text-sm text-muted-foreground text-center py-12">{t("no_results", { query: globalFilter })}</p>
			) : (
				<div className="grid grid-cols-2 gap-3">
					{rows.map((row) => (
						<ContactCard
							key={row.original.id}
							contact={row.original}
							providers={providers}
							onMutated={() => {
								refetchProviders();
								onMutated();
							}}
						/>
					))}
				</div>
			)}
		</div>
	);
}
