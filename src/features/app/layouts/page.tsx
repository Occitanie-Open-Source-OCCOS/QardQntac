import React from "react";
import { cn } from "@/lib/utils";

interface PageProps {
	children: React.ReactNode;
	className?: string;
}

export function Page({ children, className }: PageProps) {
	return <div className={cn("flex flex-1 flex-col h-full", className)}>{children}</div>;
}

export function PageHeader({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
		<header
			className={cn("flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4 mb-8", className)}
		>
			{children}
		</header>
	);
}

export function PageTitle({ title, description }: { title: string; description?: string }) {
	return (
		<div className="space-y-1.5">
			<h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{title}</h1>
			{description && <p className="text-base font-medium text-muted-foreground max-w-2xl">{description}</p>}
		</div>
	);
}

export function PageActions({ children }: { children: React.ReactNode }) {
	return <div className="flex items-center gap-3 shrink-0">{children}</div>;
}

export function PageContent({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn("flex-1 space-y-8", className)}>{children}</div>;
}

export function PageFooter({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn("mt-12 pt-8 border-t border-border/40", className)}>{children}</div>;
}
