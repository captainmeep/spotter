"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ClientFormState } from "./actions";

export type ClientFormValues = {
  full_name: string;
  email: string;
  phone: string;
  goals: string;
  status: string;
};

export function ClientForm({
  action,
  initialValues,
  submitLabel,
  cancelHref,
}: {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  initialValues?: ClientFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // After an error, show what the trainer typed rather than the saved values.
  const values = state.values ?? initialValues;

  return (
    <Card className="max-w-2xl">
      <form action={formAction}>
        <CardContent className="flex flex-col gap-5">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name">Name</Label>
            <Input
              id="full_name"
              name="full_name"
              autoComplete="off"
              defaultValue={values?.full_name}
              maxLength={100}
              required
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="off"
                defaultValue={values?.email}
              />
              <p className="text-xs text-muted-foreground">Needed to invite them to Spotter.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="off"
                defaultValue={values?.phone}
                maxLength={40}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="goals">Goals</Label>
            <Textarea
              id="goals"
              name="goals"
              rows={4}
              placeholder="What do they want to achieve?"
              defaultValue={values?.goals}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">Your client can see their goals.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Status</Label>
            <NativeSelect id="status" name="status" defaultValue={values?.status ?? "active"}>
              <NativeSelectOption value="active">Active</NativeSelectOption>
              <NativeSelectOption value="inactive">Inactive</NativeSelectOption>
            </NativeSelect>
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex justify-end gap-2">
          <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>
            Cancel
          </Link>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
