import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <ComingSoon
      title="Clients"
      phase={2}
      description="Add clients, keep their goals and notes, and invite them to log in to Spotter."
    />
  );
}
