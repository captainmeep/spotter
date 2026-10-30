"use client";

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
import { acceptInvite, type AuthFormState } from "../../actions";

export function SetPasswordForm({ token, firstName }: { token: string; firstName: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    acceptInvite.bind(null, token),
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{firstName ? `Welcome, ${firstName}!` : "Welcome!"}</CardTitle>
        <CardDescription>
          Choose a password. You&apos;ll use it with your email to log in to Spotter.
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
        <CardFooter className="mt-6">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save password and log in"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
