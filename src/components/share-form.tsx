"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

// A select and a button that link two things, like a program and a client.
export function ShareForm({
  action,
  fixed,
  select,
  options,
  placeholder,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<{ error?: string }>;
  // The side that's already known, e.g. { name: "program_id", value: "…" }.
  fixed: { name: string; value: string };
  // The field the person chooses, e.g. { name: "client_id", label: "Client" }.
  select: { name: string; label: string };
  options: { value: string; label: string }[];
  placeholder: string;
  submitLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await action(formData);
      if (result.error) toast.error(result.error);
      else form.reset();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name={fixed.name} value={fixed.value} />
      <NativeSelect
        name={select.name}
        aria-label={select.label}
        defaultValue=""
        required
        className="w-full min-w-0 sm:flex-1"
      >
        <NativeSelectOption value="" disabled>
          {placeholder}
        </NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sharing…" : submitLabel}
      </Button>
    </form>
  );
}
