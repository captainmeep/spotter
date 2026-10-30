import type { Metadata } from "next";
import Image from "next/image";
import {
  BrainIcon,
  CheckIcon,
  DumbbellIcon,
  LogInIcon,
  MoonIcon,
  SaladIcon,
} from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { Logo } from "@/components/logo";
import { trainerProfile as trainer } from "@/lib/trainer-profile";

export const metadata: Metadata = {
  title: { absolute: `${trainer.name} · ${trainer.role} in ${trainer.location}` },
  description: trainer.intro,
};

const pillarIcons = [DumbbellIcon, BrainIcon, SaladIcon, MoonIcon];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <ButtonLink href="/login" variant="ghost">
          <LogInIcon />
          Client log in
        </ButtonLink>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-20 px-4 py-12 sm:py-20">
        <section className="flex flex-col-reverse items-center gap-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex max-w-xl flex-col gap-4 text-center sm:text-left">
            <p className="text-sm font-medium text-muted-foreground">
              {trainer.role} · {trainer.location}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{trainer.name}</h1>
            <p className="text-lg text-muted-foreground">{trainer.intro}</p>
            <p className="text-sm text-muted-foreground">{trainer.experience}</p>
            <div className="mt-2 flex justify-center sm:justify-start">
              <ButtonLink href="/login" size="lg">
                <LogInIcon />
                Client log in
              </ButtonLink>
            </div>
          </div>
          <Image
            src={trainer.photo.src}
            alt={trainer.photo.alt}
            priority
            placeholder="blur"
            sizes="(min-width: 640px) 288px, 224px"
            className="size-56 shrink-0 rounded-full object-cover shadow-sm sm:size-72"
          />
        </section>

        <section aria-labelledby="pillars" className="flex flex-col gap-6">
          <h2 id="pillars" className="text-2xl font-semibold tracking-tight">
            The Four Key Pillars of Success
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trainer.pillars.map((pillar, index) => {
              const Icon = pillarIcons[index];
              return (
                <li key={pillar.title} className="flex flex-col gap-2 rounded-xl border p-5">
                  <Icon className="size-5 text-muted-foreground" />
                  <h3 className="font-medium">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground">{pillar.description}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="about" className="grid gap-10 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <h2 id="about" className="text-2xl font-semibold tracking-tight">
              About {trainer.firstName}
            </h2>
            {trainer.bio.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Education and certifications</h2>
            <ul className="flex flex-col gap-2">
              {trainer.certifications.map((certification) => (
                <li key={certification} className="flex gap-2 text-sm">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {certification}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
          <span>
            {trainer.name} · {trainer.role}
          </span>
          <span>Clients: log in to see your program.</span>
        </div>
      </footer>
    </div>
  );
}
