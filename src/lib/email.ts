import nodemailer from "nodemailer";
import type * as React from "react";
import { render } from "react-email";

import { emailConfig } from "@/config/email";

const transporter = nodemailer.createTransport(emailConfig.transport);

type SendEmailParams = {
	to: string;
	subject: string;
	content: React.ReactElement;
	from?: string;
};

export const sendEmail = async ({ to, subject, content, from }: SendEmailParams) => {
	try {
		const emailHtml = await render(content);

		const info = await transporter.sendMail({
			from: from || emailConfig.defaults.from,
			to,
			subject,
			html: emailHtml,
		});

		return { success: true, messageId: info.messageId };
	} catch (error) {
		console.error(`Failed to send email to ${to}:`, error);
		return { success: false, error };
	}
};
