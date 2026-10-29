"use client";

// Shows a date in the viewer's own time zone and language. The server renders
// in UTC, so the text may change slightly once the page loads.
export function FormattedDate({
  date,
  withTime = false,
}: {
  date: string;
  withTime?: boolean;
}) {
  const value = new Date(date);
  return (
    <time dateTime={date} suppressHydrationWarning>
      {value.toLocaleString(undefined, {
        dateStyle: "medium",
        ...(withTime ? { timeStyle: "short" } : {}),
      })}
    </time>
  );
}
