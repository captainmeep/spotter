"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type FormResult = { error?: string } | void;

// A button that opens a dialog with a form. The form stays open with what was
// typed if the action returns an error, and closes when it succeeds.
export function FormDialog({
  action,
  title,
  description,
  submitLabel,
  pendingLabel = "Saving…",
  triggerVariant = "outline",
  triggerSize = "default",
  triggerLabel,
  trigger,
  children,
}: {
  action: (formData: FormData) => Promise<FormResult>;
  title: string;
  description?: string;
  submitLabel: string;
  pendingLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerSize?: "default" | "sm" | "icon-sm";
  // Accessible name for icon-only triggers.
  triggerLabel?: string;
  trigger: ReactNode;
  // The form fields.
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(undefined);
      }}
    >
      <DialogTrigger
        render={<Button variant={triggerVariant} size={triggerSize} aria-label={triggerLabel} />}
      >
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {children}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
