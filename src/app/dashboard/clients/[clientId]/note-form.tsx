"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addNote, type NoteFormState } from "../actions";

export function NoteForm({ clientId }: { clientId: string }) {
  const [state, formAction, pending] = useActionState<NoteFormState, FormData>(
    addNote.bind(null, clientId),
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Textarea
        name="body"
        rows={3}
        placeholder="Add a note: how the session went, injuries, preferences…"
        aria-label="New note"
        maxLength={5000}
        defaultValue={state.body}
        required
      />
      <Button type="submit" className="self-end" disabled={pending}>
        {pending ? "Saving…" : "Add note"}
      </Button>
    </form>
  );
}
