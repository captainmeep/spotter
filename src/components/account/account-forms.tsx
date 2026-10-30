"use client";

import { useActionState } from "react";
import { changePassword, updateName, type AccountFormState } from "@/app/(auth)/actions";
import { FormField } from "@/components/form-field";
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

function Result({ state }: { state: AccountFormState }) {
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }
  if (state.message) {
    return (
      <Alert>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }
  return null;
}

export function NameForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(updateName, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your name</CardTitle>
        <CardDescription>Shown on your dashboard and to the people you train with.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <Result state={state} />
          <FormField id="account-name" label="Name">
            <Input
              id="account-name"
              name="full_name"
              autoComplete="name"
              defaultValue={fullName}
              maxLength={100}
              required
            />
          </FormField>
        </CardContent>
        <CardFooter className="mt-6 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save name"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>At least 8 characters.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <Result state={state} />
          <FormField id="account-current-password" label="Current password">
            <Input
              id="account-current-password"
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
            />
          </FormField>
          <FormField id="account-password" label="New password">
            <Input
              id="account-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </FormField>
          <FormField id="account-password-confirm" label="Confirm new password">
            <Input
              id="account-password-confirm"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
            />
          </FormField>
        </CardContent>
        <CardFooter className="mt-6 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Change password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
