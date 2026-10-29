import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <ComingSoon
      title="Pipeline"
      phase={5}
      description="Track leads from first contact to paying client."
    />
  );
}
