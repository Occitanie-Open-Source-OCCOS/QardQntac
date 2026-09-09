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
    <Tabs
      defaultValue="scanner"
      className="flex min-h-screen flex-col gap-0 bg-background"
    >
      <AppHeader />

      <div className="border-b border-border bg-background px-4 py-2.5">
        <TabsList className="w-full gap-1 rounded-xl bg-muted p-1 group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="scanner" className={ "h-auto flex-1 gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-active:text-foreground"}>
            {t("scanner")}
          </TabsTrigger>
          <TabsTrigger value="contacts" className={"h-auto flex-1 gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-active:text-foreground"}>
            {t("contacts")}
            {contacts.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary tabular-nums">
                {contacts.length > 99 ? "99+" : contacts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <main className="mx-auto w-full max-w-420 flex-1 p-4">
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
