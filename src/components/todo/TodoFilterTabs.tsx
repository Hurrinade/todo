import type { TodoFilter } from "@/types";

const FILTERS: { key: TodoFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "completed", label: "Completed" },
];

type TodoFilterTabsProps = {
  activeFilter: TodoFilter;
  onFilterChange: (filter: TodoFilter) => void;
};

export function TodoFilterTabs({
  activeFilter,
  onFilterChange,
}: TodoFilterTabsProps) {
  return (
    <div className="flex w-full gap-1 rounded-lg border border-border bg-background/55 p-1 sm:w-fit">
      {FILTERS.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => {
            onFilterChange(filter.key);
          }}
          className={
            "h-8 flex-1 rounded-md px-3 text-sm font-medium sm:flex-none " +
            (activeFilter === filter.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground")
          }
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
