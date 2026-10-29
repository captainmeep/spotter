import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Programs" };

export default function ProgramsPage() {
  return (
    <ComingSoon
      title="Programs"
      phase={3}
      description="Build training programs from your exercise library and share them with clients."
    />
  );
}
