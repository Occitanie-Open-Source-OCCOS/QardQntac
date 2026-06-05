// src/features/app/contacts/components/contacts-grid.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Contact, ProviderSummary, Tag } from "@/db/schemas/contacts";
import { listProviders } from "@/features/app/providers/actions/list-providers.action";
import { ProvidersManager } from "@/features/app/providers/components/providers-manager";
import { listContactTags } from "@/features/app/tags/actions/list-contact-tags.action";
import { listTags } from "@/features/app/tags/actions/list-tags.action";
import { TagChipsFilter } from "@/features/app/tags/components/tag-chips-filter";
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
  const tTags = useTranslations("tags");
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showProviders, setShowProviders] = useState(false);

  const { data: providers = [], refetch: refetchProviders } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const result = await listProviders();
      return (result?.data ?? []) as ProviderSummary[];
    },
  });

  const { data: allTags = [], refetch: refetchTags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const result = await listTags();
      return (result?.data ?? []) as Tag[];
    },
  });

  const { data: contactTagRows = [], refetch: refetchContactTags } = useQuery({
    queryKey: ["contact-tags"],
    queryFn: async () => {
      const result = await listContactTags();
      return result?.data ?? [];
    },
  });

  const contactTagMap = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const row of contactTagRows) {
      if (!map[row.contactId]) map[row.contactId] = [];
      map[row.contactId].push(row.tagId);
    }
    return map;
  }, [contactTagRows]);

  const tagFilteredContacts = useMemo(
    () =>
      selectedTagIds.length === 0
        ? contacts
        : contacts.filter((c) => {
            const ctIds = contactTagMap[c.id] ?? [];
            return selectedTagIds.some((id) => ctIds.includes(id));
          }),
    [contacts, selectedTagIds, contactTagMap],
  );

  const table = useReactTable({
    data: tagFilteredContacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
  });

  const rows = table.getRowModel().rows;

  const handleMutated = useCallback(() => {
    refetchProviders();
    refetchTags();
    refetchContactTags();
    onMutated();
  }, [refetchProviders, refetchTags, refetchContactTags, onMutated]);

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

      <TagChipsFilter
        tags={allTags}
        selectedTagIds={selectedTagIds}
        onChange={setSelectedTagIds}
        onTagCreated={refetchTags}
      />

      {showProviders && (
        <div className="p-4 rounded-xl bg-muted border border-border">
          <ProvidersManager providers={providers} onMutated={handleMutated} />
        </div>
      )}

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          {t("empty")}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          {globalFilter
            ? t("no_results", { query: globalFilter })
            : tTags("no_tag_results")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {rows.map((row) => (
            <ContactCard
              key={row.original.id}
              contact={row.original}
              providers={providers}
              allTags={allTags}
              assignedTagIds={contactTagMap[row.original.id] ?? []}
              onMutated={handleMutated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
