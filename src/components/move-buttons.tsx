"use client";

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Up and down buttons for reordering an item in a list.
export function MoveButtons({
  action,
  label,
  isFirst,
  isLast,
}: {
  action: (direction: "up" | "down") => Promise<{ error?: string }>;
  // What's being moved, for screen readers, e.g. "Day 1".
  label: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    startTransition(async () => {
      const result = await action(direction);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${label} up`}
        disabled={pending || isFirst}
        onClick={() => move("up")}
      >
        <ArrowUpIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Move ${label} down`}
        disabled={pending || isLast}
        onClick={() => move("down")}
      >
        <ArrowDownIcon />
      </Button>
    </>
  );
}
