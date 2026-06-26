"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Contact } from "@/db/schemas/contacts";
import { listContacts } from "@/features/app/contacts/actions/list-contacts.action";
import { ContactsGrid } from "@/features/app/contacts/components/contacts-grid";
import { ScannerWizard } from "@/features/app/scanner/components/scanner-wizard";
import { AppHeader } from "./app-header";

export function AppTabs() {
  const t = useTranslations("app.tabs");

  const { data: contacts = [], refetch: refetchContacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const result = await listContacts();
      return (result?.data ?? []) as Contact[];
    },
  });

  return (
    <Tabs className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <div className="bg-background border-b border-border px-4 py-1">
        <TabsList className="w-full mx-auto h-auto p-1 items-stretch">
          <TabsTrigger value="scanner">{t("scanner")}</TabsTrigger>
          <TabsTrigger value="contacts">
            {t("contacts")}
            {contacts.length > 0 && (
              <span className="ml-1.5 size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center group-data-active/trigger:bg-primary-foreground group-data-active/trigger:text-primary">
                {contacts.length > 99 ? "99+" : contacts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <main className="flex-1 w-full max-w-420 mx-auto p-4">
        <TabsContent value="scanner" keepMounted>
          <ScannerWizard />
        </TabsContent>
        <TabsContent value="contacts" keepMounted>
          <ContactsGrid contacts={contacts} onMutated={refetchContacts} />
        </TabsContent>
      </main>
    </Tabs>
  );
}
