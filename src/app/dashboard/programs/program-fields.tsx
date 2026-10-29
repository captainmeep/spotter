import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type ProgramValues = {
  name: string;
  description: string;
  duration_weeks: string;
};

// Fields for creating a program or editing its details.
export function ProgramFields({ values }: { values?: ProgramValues }) {
  return (
    <>
      <FormField id="program-name" label="Name">
        <Input
          id="program-name"
          name="name"
          placeholder="For example: Beginner strength"
          defaultValue={values?.name}
          maxLength={100}
          required
        />
      </FormField>
      <FormField id="program-description" label="Description" hint="Your clients see this.">
        <Textarea
          id="program-description"
          name="description"
          rows={3}
          placeholder="Who it's for, how often to train, how hard to push."
          defaultValue={values?.description}
          maxLength={2000}
        />
      </FormField>
      <FormField
        id="program-weeks"
        label="Length in weeks"
        hint="How many weeks to repeat the workouts. Leave empty for no end date."
        className="max-w-48"
      >
        <Input
          id="program-weeks"
          name="duration_weeks"
          type="number"
          inputMode="numeric"
          min={1}
          max={52}
          defaultValue={values?.duration_weeks}
        />
      </FormField>
    </>
  );
}
