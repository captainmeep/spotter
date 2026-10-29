import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "My program" };

export default function ProgramPage() {
  return (
    <ComingSoon
      title="My program"
      phase={3}
      description="Your trainer will share your training program here."
    />
  );
}
