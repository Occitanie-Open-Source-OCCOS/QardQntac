import { getTranslations } from "next-intl/server";
import MagicLinkEmail from "@/features/auth/emails/templates/magic-link.email";
import { sendEmail } from "@/lib/email";

export const sendMagicLinkEmail = async (to: string, { name, magicLink }: { name: string; magicLink: string }) => {
	const [tMagicLink, tEmailLayout] = await Promise.all([
		getTranslations("auth.emails.magic-link"),
		getTranslations("emails.layout"),
	]);

	return sendEmail({
		to,
		subject: tMagicLink("subject"),
		content: MagicLinkEmail({
			name,
			magicLink,
			messages: {
				preview: tMagicLink("preview"),
				heading: tMagicLink("heading"),
				greeting: tMagicLink("greeting"),
				waitingConfirmation: tMagicLink("waitingConfirmation"),
				buttonLabel: tMagicLink("buttonLabel"),
				closing: tMagicLink("closing"),
				teamPrefix: tMagicLink("teamPrefix"),
			},
			layoutMessages: {
				copyright: tEmailLayout("copyright", {
					year: new Date().getFullYear(),
				}),
			},
		}),
	});
};
