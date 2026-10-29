import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRightIcon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { listClients, type ClientStatus } from "@/lib/clients";
import { cn } from "@/lib/utils";
import { PortalBadge, StatusBadge } from "./client-badges";

export const metadata: Metadata = { title: "Clients" };

const statusFilters: { label: string; status?: ClientStatus }[] = [
  { label: "Active", status: "active" },
  { label: "Inactive", status: "inactive" },
  { label: "All" },
];

type Filters = { search: string; status?: ClientStatus };

function readFilters(searchParams: Record<string, string | string[] | undefined>): Filters {
  const search = typeof searchParams.q === "string" ? searchParams.q : "";
  const status = searchParams.status;
  // Active clients by default; ?status=all shows everyone.
  if (status === "all") return { search };
  return { search, status: status === "inactive" ? "inactive" : "active" };
}

export default function ClientsPage({ searchParams }: PageProps<"/dashboard/clients">) {
  const filters = searchParams.then(readFilters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Clients" description="Everyone you train, in one place." />
        <ButtonLink href="/dashboard/clients/new">
          <PlusIcon />
          Add client
        </ButtonLink>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <FilterBar filters={filters} />
        <ClientList filters={filters} />
      </Suspense>
    </div>
  );
}

async function FilterBar({ filters }: { filters: Promise<Filters> }) {
  const { search, status } = await filters;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav className="flex gap-1 rounded-lg bg-muted p-1" aria-label="Filter by status">
        {statusFilters.map((filter) => {
          const active = filter.status === status;
          const params = new URLSearchParams();
          params.set("status", filter.status ?? "all");
          if (search) params.set("q", search);
          return (
            <Link
              key={filter.label}
              href={`/dashboard/clients?${params}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex-1 rounded-md px-3 py-1 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:flex-none",
                active && "bg-background text-foreground shadow-sm",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>
      <Form action="/dashboard/clients" className="relative sm:w-72">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input type="hidden" name="status" value={status ?? "all"} />
        <Input
          name="q"
          type="search"
          placeholder="Search name, email or phone"
          aria-label="Search clients"
          defaultValue={search}
          className="pl-8"
        />
      </Form>
    </div>
  );
}

const emptyMessages = {
  active: "No active clients yet.",
  inactive: "No inactive clients.",
  all: "No clients yet.",
};

async function ClientList({ filters }: { filters: Promise<Filters> }) {
  const { search, status } = await filters;
  const clients = await listClients({ search, status });

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <UsersIcon className="size-8 text-muted-foreground" />
        <p className="font-medium">
          {search ? "No clients match your search." : emptyMessages[status ?? "all"]}
        </p>
        {!search && status !== "inactive" && (
          <ButtonLink href="/dashboard/clients/new" variant="outline">
            <PlusIcon />
            Add a client
          </ButtonLink>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-xl border">
      {clients.map((client) => (
        <li key={client.id}>
          <Link
            href={`/dashboard/clients/${client.id}`}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-medium">{client.full_name}</span>
              <span className="truncate text-sm text-muted-foreground">
                {[client.email, client.phone].filter(Boolean).join(" · ") || "No contact details"}
              </span>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <PortalBadge hasLogin={Boolean(client.user_id)} />
              <StatusBadge status={client.status} />
            </div>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
