import { ClipboardXIcon } from "lucide-react";
import { ButtonLink } from "@/components/button-link";

export default function ProgramNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <ClipboardXIcon className="size-8 text-muted-foreground" />
      <p className="font-medium">We couldn&apos;t find that program.</p>
      <p className="text-sm text-muted-foreground">It may have been deleted.</p>
      <ButtonLink href="/dashboard/programs" variant="outline">
        Back to programs
      </ButtonLink>
    </div>
  );
}
