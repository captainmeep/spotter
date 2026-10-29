import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  return (
    <ComingSoon
      title="Sessions"
      phase={4}
      description="Your upcoming and past sessions with your trainer will show up here."
    />
  );
}
