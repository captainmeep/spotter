import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type ExerciseValues = {
  name: string;
  category: string;
  instructions: string;
  video_url: string | null;
};

// Fields for adding or editing a library exercise.
export function ExerciseFields({
  values,
  categories,
}: {
  values?: ExerciseValues;
  categories: string[];
}) {
  return (
    <>
      <FormField id="exercise-name" label="Name">
        <Input id="exercise-name" name="name" defaultValue={values?.name} maxLength={100} required />
      </FormField>
      <FormField id="exercise-category" label="Category" hint="For example Legs, Push, Pull, Core or Cardio.">
        <Input
          id="exercise-category"
          name="category"
          list="exercise-categories"
          defaultValue={values?.category}
          maxLength={50}
        />
        <datalist id="exercise-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </FormField>
      <FormField id="exercise-instructions" label="How to do it" hint="Your clients see this with their program.">
        <Textarea
          id="exercise-instructions"
          name="instructions"
          rows={3}
          defaultValue={values?.instructions}
          maxLength={2000}
        />
      </FormField>
      <FormField id="exercise-video" label="Video link" hint="Optional, for example a YouTube demo.">
        <Input
          id="exercise-video"
          name="video_url"
          type="url"
          placeholder="https://"
          defaultValue={values?.video_url ?? ""}
          maxLength={500}
        />
      </FormField>
    </>
  );
}
