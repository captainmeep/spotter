"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPassword, type AuthFormState } from "../actions";

export function SetPasswordForm({
  firstName,
  skipHref,
}: {
  firstName: string;
  skipHref: string;
}) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    setPassword,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{firstName ? `Welcome, ${firstName}!` : "Welcome!"}</CardTitle>
        <CardDescription>
          Choose a password so you can log in to Spotter next time.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save password"}
          </Button>
          <Link href={skipHref} className="text-sm text-muted-foreground underline underline-offset-4">
            Skip for now
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
