// src/features/app/tags/components/tag-chips-filter.tsx
"use client";

import { useTranslations } from "next-intl";
import type { Tag } from "@/db/schemas/contacts";

interface TagChipsFilterProps {
	tags: Tag[];
	selectedTagIds: string[];
	onChange: (ids: string[]) => void;
}

function hexToTextColor(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.6 ? "#1e293b" : "#ffffff";
}

function hexToBackground(hex: string, active: boolean): string {
	if (active) return hex;
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r},${g},${b},0.15)`;
}

export function TagChipsFilter({ tags, selectedTagIds, onChange }: TagChipsFilterProps) {
	const t = useTranslations("tags");

	const toggleTag = (id: string) => {
		if (selectedTagIds.includes(id)) {
			onChange(selectedTagIds.filter((t) => t !== id));
		} else {
			onChange([...selectedTagIds, id]);
		}
	};

	if (tags.length === 0) return null;

	return (
		<div className="overflow-x-auto">
			<div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
				<button
					type="button"
					onClick={() => onChange([])}
					className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
						selectedTagIds.length === 0
							? "bg-primary text-primary-foreground"
							: "bg-muted text-muted-foreground hover:text-foreground"
					}`}
				>
					{t("all")}
				</button>
				{tags.map((tag) => {
					const active = selectedTagIds.includes(tag.id);
					const bg = hexToBackground(tag.color, active);
					const color = active ? hexToTextColor(tag.color) : tag.color;
					return (
						<button
							key={tag.id}
							type="button"
							onClick={() => toggleTag(tag.id)}
							className="px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap border"
							style={{
								backgroundColor: bg,
								color: color,
								borderColor: tag.color,
							}}
						>
							{tag.name}
						</button>
					);
				})}
			</div>
		</div>
	);
}
