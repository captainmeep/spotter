import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type Values = {
  sets: number | null;
  reps: string;
  weight: string;
  rest: string;
  notes: string;
};

export type LibraryOption = { id: string; name: string; category: string };

// Fields for an exercise in a workout. The exercise itself is only chosen
// when adding; to swap it, remove it and add another.
export function WorkoutExerciseFields({
  library,
  values,
}: {
  library?: LibraryOption[];
  values?: Values;
}) {
  const groups = new Map<string, LibraryOption[]>();
  for (const exercise of library ?? []) {
    const category = exercise.category || "Other";
    groups.set(category, [...(groups.get(category) ?? []), exercise]);
  }

  return (
    <>
      {library && (
        <FormField id="item-exercise" label="Exercise">
          <NativeSelect id="item-exercise" name="exercise_id" defaultValue="" required className="w-full">
            <NativeSelectOption value="" disabled>
              Choose an exercise
            </NativeSelectOption>
            {[...groups].map(([category, exercises]) => (
              <NativeSelectOptGroup key={category} label={category}>
                {exercises.map((exercise) => (
                  <NativeSelectOption key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </NativeSelectOption>
                ))}
              </NativeSelectOptGroup>
            ))}
          </NativeSelect>
        </FormField>
      )}
      <div className="grid grid-cols-2 gap-4">
        <FormField id="item-sets" label="Sets">
          <Input
            id="item-sets"
            name="sets"
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            defaultValue={values?.sets ?? 3}
          />
        </FormField>
        <FormField id="item-reps" label="Reps">
          <Input id="item-reps" name="reps" placeholder="10, 8-12, 30s" defaultValue={values?.reps} maxLength={30} />
        </FormField>
        <FormField id="item-weight" label="Weight">
          <Input id="item-weight" name="weight" placeholder="20 kg" defaultValue={values?.weight} maxLength={30} />
        </FormField>
        <FormField id="item-rest" label="Rest">
          <Input id="item-rest" name="rest" placeholder="90s" defaultValue={values?.rest} maxLength={30} />
        </FormField>
      </div>
      <FormField id="item-notes" label="Notes">
        <Textarea
          id="item-notes"
          name="notes"
          rows={2}
          placeholder="Tempo, form cues, how to progress."
          defaultValue={values?.notes}
          maxLength={500}
        />
      </FormField>
    </>
  );
}
