import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { contactTags, contacts, tags, userCardDavProviders } from "./contacts";

declare module "./contacts" {
	export type Contact = InferSelectModel<typeof contacts>;
	export type NewContact = InferInsertModel<typeof contacts>;

	export type UserCardDavProvider = InferSelectModel<typeof userCardDavProviders>;
	export type NewUserCardDavProvider = InferInsertModel<typeof userCardDavProviders>;

	export type ProviderSummary = Omit<UserCardDavProvider, "password">;

	export type Tag = InferSelectModel<typeof tags>;
	export type NewTag = InferInsertModel<typeof tags>;

	export type ContactTag = InferSelectModel<typeof contactTags>;
	export type NewContactTag = InferInsertModel<typeof contactTags>;
}
