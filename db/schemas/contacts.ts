import { pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userCardDavProviders = pgTable("user_carddav_providers", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id").notNull(),
	type: text("type").notNull(),
	label: text("label").notNull(),
	url: text("url").notNull(),
	username: text("username").notNull(),
	password: text("password").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contacts = pgTable("contacts", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	name: text("name").notNull().default(""),
	title: text("title").notNull().default(""),
	company: text("company").notNull().default(""),
	email: text("email").notNull().default(""),
	phone: text("phone").notNull().default(""),
	website: text("website").notNull().default(""),
	address: text("address").notNull().default(""),
	imageUrl: text("image_url"),
	remoteId: text("remote_id"),
	providerId: uuid("provider_id"),
	syncedAt: timestamp("synced_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type UserCardDavProvider = typeof userCardDavProviders.$inferSelect;
export type NewUserCardDavProvider = typeof userCardDavProviders.$inferInsert;
export type ProviderSummary = Omit<UserCardDavProvider, "password">;
