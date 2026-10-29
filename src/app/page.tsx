import {
  CalendarDaysIcon,
  ClipboardListIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { Logo } from "@/components/logo";

const features = [
  {
    icon: UsersIcon,
    title: "Clients",
    description: "Contact details, goals, notes and progress in one place.",
  },
  {
    icon: ClipboardListIcon,
    title: "Training programs",
    description: "Build programs once and share them with your clients.",
  },
  {
    icon: CalendarDaysIcon,
    title: "Scheduling",
    description: "Book sessions and keep everyone on the same calendar.",
  },
  {
    icon: TrendingUpIcon,
    title: "Sales pipeline",
    description: "Follow every lead from first message to paying client.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost">
            Log in
          </ButtonLink>
          <ButtonLink href="/signup">
            Sign up
          </ButtonLink>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-16 sm:py-24">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Run your training business from one place.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Spotter keeps your clients, programs, sessions and leads together, so
          you can spend less time on admin and more time training.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/signup" size="lg">
            Create a trainer account
          </ButtonLink>
          <ButtonLink
            href="/login" variant="outline" size="lg"
          >
            I&apos;m a client
          </ButtonLink>
        </div>

        <ul className="mt-16 grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <li key={title} className="rounded-xl border p-5">
              <Icon className="size-5 text-muted-foreground" />
              <h2 className="mt-3 font-medium">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
