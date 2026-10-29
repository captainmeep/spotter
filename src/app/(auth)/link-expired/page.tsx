import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
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
        <Link href="/login" className={buttonVariants({ className: "w-full" })}>
          Go to log in
        </Link>
      </CardFooter>
    </Card>
  );
}
