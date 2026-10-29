"use client";

import { useActionState } from "react";
import { ButtonLink } from "@/components/button-link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { createProgram, type ProgramFormState } from "../actions";
import { ProgramFields } from "../program-fields";

export function NewProgramForm() {
  const [state, formAction, pending] = useActionState<ProgramFormState, FormData>(
    createProgram,
    {},
  );

  return (
    <Card className="max-w-2xl">
      <form action={formAction}>
        <CardContent className="flex flex-col gap-5">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <ProgramFields values={state.values} />
        </CardContent>
        <CardFooter className="mt-6 flex justify-end gap-2">
          <ButtonLink href="/dashboard/programs" variant="outline">
            Cancel
          </ButtonLink>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create program"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
