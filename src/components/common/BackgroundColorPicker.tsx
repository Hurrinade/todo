import { Button } from "@/components/ui/button";
import { useT, useTheme } from "@/hooks";
import { cn } from "@/lib/utils";
import type { BackgroundColorPreference } from "@/types";

type BackgroundColorOption = {
  value: BackgroundColorPreference;
  className: string;
};

const backgroundColorOptions: BackgroundColorOption[] = [
  {
    value: "blue",
    className: "bg-[#9dc7ff] dark:bg-[#18355e]",
  },
  {
    value: "purple",
    className: "bg-[#c5afff] dark:bg-[#3c296c]",
  },
  {
    value: "regular",
    className: "bg-[#f6f1e8] dark:bg-[#040609]",
  },
];

export default function BackgroundColorPicker() {
  const { backgroundColor, setBackgroundColorPreference } = useTheme();
  const t = useT();

  return (
    <div
      aria-label={t.theme.backgroundSelection}
      className="flex shrink-0 rounded-lg border border-border bg-card/95 p-1 text-card-foreground shadow-sm"
      role="group"
    >
      {backgroundColorOptions.map(({ value, className }) => {
        const isSelected = backgroundColor === value;
        const label = t.theme.backgrounds[value];

        return (
          <Button
            aria-label={label}
            aria-pressed={isSelected}
            className={cn(
              "rounded-md border border-transparent p-0 pointer-fine:size-7 hover:bg-transparent",
              isSelected && "border-ring ring-2 ring-ring/35",
            )}
            key={value}
            onClick={() => {
              setBackgroundColorPreference(value);
            }}
            size="icon-mobile-sm"
            title={label}
            type="button"
            variant="ghost"
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-4 rounded-full ring-1 ring-foreground/15",
                className,
              )}
            />
          </Button>
        );
      })}
    </div>
  );
}
