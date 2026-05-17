import { Button } from "@/components/ui/button";
import type { TodoFilter, TodoListWithStats } from "@/types";

const FILTERS: { key: TodoFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "completed", label: "Completed" },
];

type TodoFilterTabsProps = {
  list: TodoListWithStats;
  activeFilter: TodoFilter;
  onFilterChange: (filter: TodoFilter) => void;
};

export function TodoFilterTabs({
  list,
  activeFilter,
  onFilterChange,
}: TodoFilterTabsProps) {
  const totalTodoCount = list.openTodoCount + list.completedTodoCount;

  return (
    <div className="flex w-full gap-1 p-5 sm:w-fit">
      {FILTERS.map((filter) => (
        <Button
          key={filter.key}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onFilterChange(filter.key);
          }}
          className={
            "h-8 flex-1 rounded-md px-3 py-5 text-sm font-medium sm:flex-none " +
            (activeFilter === filter.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground")
          }
        >
          {filter.label} (
          {filter.key === "all"
            ? totalTodoCount
            : filter.key === "open"
              ? list.openTodoCount
              : list.completedTodoCount}
          )
        </Button>
      ))}
    </div>
  );
}
