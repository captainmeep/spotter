import { UserXIcon } from "lucide-react";
import { ButtonLink } from "@/components/button-link";

export default function ClientNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <UserXIcon className="size-8 text-muted-foreground" />
      <p className="font-medium">We couldn&apos;t find that client.</p>
      <p className="text-sm text-muted-foreground">They may have been deleted.</p>
      <ButtonLink href="/dashboard/clients" variant="outline">
        Back to clients
      </ButtonLink>
    </div>
  );
}
