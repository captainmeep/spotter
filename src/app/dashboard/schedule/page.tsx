import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <ComingSoon
      title="Schedule"
      phase={4}
      description="Book sessions with your clients and see your week at a glance."
    />
  );
}
