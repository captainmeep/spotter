import { Badge } from "@/components/ui/badge";
import type { ClientStatus } from "@/lib/clients";

export function StatusBadge({ status }: { status: ClientStatus }) {
  return status === "active" ? (
    <Badge>Active</Badge>
  ) : (
    <Badge variant="secondary">Inactive</Badge>
  );
}

export function PortalBadge({ hasLogin }: { hasLogin: boolean }) {
  return hasLogin ? <Badge variant="outline">Invited</Badge> : null;
}
