import type { Metadata } from "next";
import { AccountPage } from "@/components/account/account-page";

export const metadata: Metadata = { title: "Account settings" };

export default function Page() {
  return <AccountPage role="client" />;
}
