import Link from "next/link";
import { UserXIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function ClientNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <UserXIcon className="size-8 text-muted-foreground" />
      <p className="font-medium">We couldn&apos;t find that client.</p>
      <p className="text-sm text-muted-foreground">They may have been deleted.</p>
      <Link href="/dashboard/clients" className={buttonVariants({ variant: "outline" })}>
        Back to clients
      </Link>
    </div>
  );
}
