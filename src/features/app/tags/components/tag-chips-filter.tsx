"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Tag } from "@/db/schemas/contacts";
import { createTag } from "../actions/create-tag.action";
import { hexToBackground, hexToTextColor } from "@/utils/color";

const PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#0ea5e9",
  "#64748b",
  "#1e293b",
];

interface TagChipsFilterProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
  onTagCreated?: () => void;
}

export function TagChipsFilter({
  tags,
  selectedTagIds,
  onChange,
  onTagCreated,
}: TagChipsFilterProps) {
  const t = useTranslations("tags");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  const { execute: execCreate, isPending: isCreating } = useAction(createTag, {
    onSuccess: () => {
      toast.success(t("created_toast"));
      setName("");
      setColor(PALETTE[0]);
      setOpen(false);
      onTagCreated?.();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Erreur"),
  });

  const toggleTag = (id: string) => {
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((tid) => tid !== id));
    } else {
      onChange([...selectedTagIds, id]);
    }
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="flex gap-2 pb-1 items-center"
        style={{ width: "max-content" }}
      >
        {tags.length > 0 && (
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
        )}
        {tags.map((tag) => {
          const active = selectedTagIds.includes(tag.id);
          const bg = hexToBackground(tag.color, active);
          const textColor = active ? hexToTextColor(tag.color) : tag.color;
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap border"
              style={{
                backgroundColor: bg,
                color: textColor,
                borderColor: tag.color,
              }}
            >
              {tag.name}
            </button>
          );
        })}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="inline-flex items-center justify-center size-6 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
              />
            }
            title={t("new_tag")}
          >
            <PlusIcon className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent className="w-52 p-3" side="bottom" align="start">
            <div className="flex flex-col gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("name_placeholder")}
                className="h-7 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (name.trim() && !isCreating)
                      execCreate({ name: name.trim(), color });
                  }
                }}
              />
              <div className="flex flex-wrap gap-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="size-5 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "#000" : "transparent",
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  disabled={!name.trim() || isCreating}
                  onClick={() => execCreate({ name: name.trim(), color })}
                >
                  {t("create")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setOpen(false);
                    setName("");
                  }}
                >
                  <XIcon className="size-3" />
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
