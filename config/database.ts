import { env } from "../env";

export const dbConfig = {
	url: env.DATABASE_URL,
	//ssl: env.NODE_ENV  === "production",
};
