"use client";

import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// A button that runs a server action, showing a toast if it fails.
export function ActionButton({
  action,
  pendingLabel,
  variant = "outline",
  children,
}: {
  action: () => Promise<{ error?: string } | void>;
  pendingLabel: string;
  variant?: "default" | "outline" | "ghost";
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={variant}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await action();
          if (result?.error) toast.error(result.error);
        })
      }
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
