"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Tag } from "@/db/schemas/contacts";
import { saveContact } from "@/features/app/contacts/actions/save-contact.action";
import { contactSchema } from "@/features/app/contacts/schemas/contact.schema";
import { assignTags } from "@/features/app/tags/actions/assign-tags.action";
import { listTags } from "@/features/app/tags/actions/list-tags.action";
import { useZodForm } from "@/features/common/hooks/use-zod-form";
import type { ContactData } from "@/lib/types";

interface ReviewStepProps {
  imageUrl: string;
  data: ContactData;
  onSave: () => void;
  onRetry: () => void;
}

export function ReviewStep({
  imageUrl,
  data,
  onSave,
  onRetry,
}: ReviewStepProps) {
  const t = useTranslations("scanner.review");
  const tTags = useTranslations("tags");
  const queryClient = useQueryClient();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const form = useZodForm({
    schema: contactSchema,
    defaultValues: data,
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const result = await listTags();
      return (result?.data ?? []) as Tag[];
    },
  });

  const { execute, isPending } = useAction(saveContact, {
    onSuccess: async ({ data: saveData }) => {
      if (saveData?.id && selectedTagIds.length > 0) {
        await assignTags({ contactId: saveData.id, tagIds: selectedTagIds });
        queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      }
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(t("saved_toast"));
      onSave();
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? t("save_error"));
    },
  });

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id)
        ? prev.filter((prevId) => prevId !== id)
        : [...prev, id],
    );
  };

  const inputClass = "bg-background h-10 px-3 py-2 text-sm";
  const labelClass =
    "text-xs font-medium text-muted-foreground uppercase tracking-wide";

  return (
    <Form
      form={form}
      className="flex flex-col gap-4 py-6 px-4"
      onSubmit={(v) => execute(v)}
    >
      <h1 className="text-2xl font-black tracking-tight">{t("title")}</h1>

      {imageUrl && (
        <div className="w-24 h-16 rounded-lg overflow-hidden border border-border self-center">
          <img
            src={imageUrl}
            alt="preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="firstname"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className={labelClass}>{t("firstname")}</FormLabel>
              <FormControl>
                <Input type="text" className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastname"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className={labelClass}>{t("lastname")}</FormLabel>
              <FormControl>
                <Input type="text" className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className={labelClass}>{t("title_field")}</FormLabel>
              <FormControl>
                <Input type="text" className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className={labelClass}>{t("company")}</FormLabel>
              <FormControl>
                <Input type="text" className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className={labelClass}>{t("email")}</FormLabel>
              <FormControl>
                <Input type="text" className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className={labelClass}>{t("phone")}</FormLabel>
              <FormControl>
                <Input type="text" className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className={labelClass}>{t("website")}</FormLabel>
              <FormControl>
                <Input type="text" className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className={labelClass}>{t("address")}</FormLabel>
              <FormControl>
                <Input type="text" className={inputClass} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {allTags.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className={labelClass}>{tTags("tag_label")}</label>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const active = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
                    style={{
                      backgroundColor: active ? tag.color : `${tag.color}22`,
                      color: active ? "#fff" : tag.color,
                      borderColor: tag.color,
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onRetry}
        >
          {t("retry_btn")}
        </Button>
        <Button
          type="submit"
          variant="default"
          className="flex-1"
          disabled={isPending}
        >
          {t("save_btn")}
        </Button>
      </div>
    </Form>
  );
}
