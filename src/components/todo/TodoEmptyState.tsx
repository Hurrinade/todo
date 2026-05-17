import type { LucideIcon } from "lucide-react";

type TodoEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function TodoEmptyState({
  icon: Icon,
  title,
  description,
}: TodoEmptyStateProps) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 bg-background/35 p-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
