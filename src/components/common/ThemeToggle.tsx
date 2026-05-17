import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks";
import type { ThemeOption } from "@/types";

const themeOptions: ThemeOption[] = [
  {
    value: "system",
    label: "Use system theme",
    icon: Monitor,
  },
  {
    value: "light",
    label: "Use light theme",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Use dark theme",
    icon: Moon,
  },
];

export default function ThemeToggle() {
  const { preference, setThemePreference } = useTheme();

  return (
    <div
      aria-label="Theme selection"
      className="flex rounded-lg border border-border bg-card/95 p-1 text-card-foreground shadow-sm"
      role="group"
    >
      {themeOptions.map(({ value, label, icon: Icon }) => {
        const isSelected = preference === value;

        return (
          <Button
            aria-label={label}
            aria-pressed={isSelected}
            className="rounded-md"
            key={value}
            onClick={() => {
              setThemePreference(value);
            }}
            size="icon-sm"
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
