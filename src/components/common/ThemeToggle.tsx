import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, useTheme } from "@/hooks";
import type { ThemeOption } from "@/types";

const themeOptions: ThemeOption[] = [
  {
    value: "system",
    icon: Monitor,
  },
  {
    value: "light",
    icon: Sun,
  },
  {
    value: "dark",
    icon: Moon,
  },
];

export default function ThemeToggle() {
  const { preference, setThemePreference } = useTheme();
  const t = useT();

  return (
    <div
      aria-label={t.theme.selection}
      className="flex min-w-0 flex-1 rounded-lg border border-border bg-card/95 text-card-foreground shadow-sm"
      role="group"
    >
      {themeOptions.map(({ value, icon: Icon }) => {
        const isSelected = preference === value;
        const label = t.theme.modes[value];

        return (
          <Button
            aria-label={label}
            aria-pressed={isSelected}
            className="flex-1 rounded-none first:rounded-l-lg last:rounded-r-lg"
            key={value}
            onClick={() => {
              setThemePreference(value);
            }}
            size="icon-mobile-sm"
            title={label}
            type="button"
            variant={isSelected ? "secondary" : "ghost"}
          >
            <Icon aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}
