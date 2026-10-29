import type { Metadata } from "next";
import { ButtonLink } from "@/components/button-link";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Link expired" };

export default function LinkExpiredPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>That link didn&apos;t work</CardTitle>
        <CardDescription>
          It may have expired or already been used. Try logging in, or ask your
          trainer to send a new invite.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <ButtonLink href="/login" className="w-full">
          Go to log in
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}
