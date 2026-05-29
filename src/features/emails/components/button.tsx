import * as React from "react";
import { Button as BT } from "react-email";

interface ButtonProps {
	href: string;
	children: React.ReactNode;
}

export default function Button({ href, children }: ButtonProps) {
	return (
		<BT
			href={href}
			style={{
				backgroundColor: "#060505",
				borderRadius: "0px",
				color: "#EFEFEF",
				fontSize: "16px",
				fontWeight: "bold",
				textDecoration: "none",
				textAlign: "center" as const,
				display: "block",
				width: "100%",
				padding: "16px 32px",
			}}
		>
			{children}
		</BT>
	);
}
