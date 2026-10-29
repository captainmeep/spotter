import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard/programs", label: "Programs" },
  { href: "/dashboard/programs/exercises", label: "Exercise library" },
];

export function ProgramsTabs({ active }: { active: "/dashboard/programs" | "/dashboard/programs/exercises" }) {
  return (
    <nav className="flex w-fit gap-1 rounded-lg bg-muted p-1" aria-label="Programs sections">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            tab.href === active && "bg-background text-foreground shadow-sm",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
