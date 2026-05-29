import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

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
	syncedAt: timestamp("synced_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userCarddavConfig = pgTable("user_carddav_config", {
	userId: text("user_id").primaryKey(),
	url: text("url").notNull(),
	username: text("username").notNull(),
	password: text("password").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type UserCarddavConfig = typeof userCarddavConfig.$inferSelect;
