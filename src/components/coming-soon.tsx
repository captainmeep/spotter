import { ConstructionIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";

// Placeholder for sections planned in a later phase.
export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} />
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <ConstructionIcon className="size-8 text-muted-foreground" />
        <Badge variant="secondary">Coming in phase {phase}</Badge>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
