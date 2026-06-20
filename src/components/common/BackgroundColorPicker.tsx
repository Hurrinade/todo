import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks";
import { cn } from "@/lib/utils";
import type { BackgroundColorPreference } from "@/types";

type BackgroundColorOption = {
  value: BackgroundColorPreference;
  label: string;
  className: string;
};

const backgroundColorOptions: BackgroundColorOption[] = [
  {
    value: "blue",
    label: "Use blue background",
    className: "bg-[#9dc7ff] dark:bg-[#18355e]",
  },
  {
    value: "purple",
    label: "Use purple background",
    className: "bg-[#c5afff] dark:bg-[#3c296c]",
  },
  {
    value: "regular",
    label: "Use regular background",
    className: "bg-[#f6f1e8] dark:bg-[#040609]",
  },
];

export default function BackgroundColorPicker() {
  const { backgroundColor, setBackgroundColorPreference } = useTheme();

  return (
    <div
      aria-label="Background color selection"
      className="flex shrink-0 rounded-lg border border-border bg-card/95 p-1 text-card-foreground shadow-sm"
      role="group"
    >
      {backgroundColorOptions.map(({ value, label, className }) => {
        const isSelected = backgroundColor === value;

        return (
          <Button
            aria-label={label}
            aria-pressed={isSelected}
            className={cn(
              "size-7 rounded-md border border-transparent p-0 hover:bg-transparent",
              isSelected && "border-ring ring-2 ring-ring/35",
            )}
            key={value}
            onClick={() => {
              setBackgroundColorPreference(value);
            }}
            size="icon-sm"
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
