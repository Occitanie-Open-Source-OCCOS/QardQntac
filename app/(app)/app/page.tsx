import { AppTabs } from "@/features/app/layouts/app-tabs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "App | QardQntac",
  description:
    "QardQntac is a contact management application designed to help you organize and manage your contacts efficiently. With QardQntac, you can easily add, edit, and categorize your contacts, making it easier to stay connected with friends, family, and colleagues.",
};

export default async function App() {
  return <AppTabs />;
}
