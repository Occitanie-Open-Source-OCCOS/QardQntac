import { zodResolver } from "@hookform/resolvers/zod";
import { type UseFormProps, type UseFormReturn, useForm } from "react-hook-form";
import type { z } from "zod";

export function useZodForm<S extends z.ZodType<any, any, any>>(
	props: Omit<UseFormProps<z.infer<S>>, "resolver"> & { schema: S },
): UseFormReturn<z.infer<S>> {
	return useForm<z.infer<S>>({
		...props,
		resolver: zodResolver(props.schema) as any,
	});
}
