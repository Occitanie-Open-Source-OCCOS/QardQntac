import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { account, invitation, member, membership_profiles, session, user, verification } from "./auth";
import { membershipApplications } from "./contacts";

declare module "./auth" {
	export type User = InferSelectModel<typeof user>;
	export type InsertUser = InferInsertModel<typeof user>;

	export type Session = InferSelectModel<typeof session>;
	export type InsertSession = InferInsertModel<typeof session>;

	export type Account = InferSelectModel<typeof account>;
	export type InsertAccount = InferInsertModel<typeof account>;

	export type Verification = InferSelectModel<typeof verification>;
	export type InsertVerification = InferInsertModel<typeof verification>;

	export type Organization = InferSelectModel<typeof membership_profiles>;
	export type InsertOrganization = InferInsertModel<typeof membership_profiles>;

	export type Member = InferSelectModel<typeof member>;
	export type InsertMember = InferInsertModel<typeof member>;

	export type Invitation = InferSelectModel<typeof invitation>;
	export type InsertInvitation = InferInsertModel<typeof invitation>;
}
