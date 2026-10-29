export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
