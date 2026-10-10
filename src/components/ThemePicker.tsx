import { Check, Moon, Palette, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const THEME_STORAGE_KEY = "lexy-theme";

const themes = [
  { id: "original", label: "Original", icon: Palette, swatches: ["bg-primary", "bg-secondary", "bg-accent"] },
  { id: "light", label: "Claro", icon: Sun, swatches: ["bg-background", "bg-secondary", "bg-accent"] },
  { id: "dark", label: "Escuro", icon: Moon, swatches: ["bg-background", "bg-primary", "bg-accent"] },
  { id: "purple", label: "Roxo", icon: Sparkles, swatches: ["bg-primary", "bg-secondary", "bg-accent"] },
] as const;

export type LexyTheme = (typeof themes)[number]["id"];

function applyTheme(theme: LexyTheme) {
  document.documentElement.dataset["theme"] = theme;
  document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
}

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<LexyTheme>("original");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const selected = themes.some((item) => item.id === stored) ? (stored as LexyTheme) : "original";
    setTheme(selected);
    applyTheme(selected);
  }, []);

  function chooseTheme(next: LexyTheme) {
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  if (!compact) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Tema de cores">
        {themes.map(({ id, label, icon: Icon, swatches }) => (
          <Button
            key={id}
            type="button"
            variant="outline"
            aria-pressed={theme === id}
            onClick={() => chooseTheme(id)}
            className={cn(
              "interactive-card h-auto min-h-24 flex-col items-stretch gap-3 rounded-xl p-3",
              theme === id && "border-primary bg-muted ring-2 ring-ring",
            )}
          >
            <span className="flex w-full items-center justify-between">
              <span className="flex items-center gap-2 font-black"><Icon aria-hidden />{label}</span>
              {theme === id && <Check className="text-accent" aria-hidden />}
            </span>
            <span className="flex h-7 w-full overflow-hidden rounded-md border border-border" aria-hidden>
              {swatches.map((swatch, index) => <span key={`${id}-${index}`} className={cn("flex-1", swatch)} />)}
            </span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full" aria-label="Personalizar cores">
          <Palette aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 rounded-xl p-3">
        <p className="mb-2 text-sm font-black">Cores do LEXY</p>
        <div className="grid gap-1">
          {themes.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant={theme === id ? "secondary" : "ghost"}
              onClick={() => chooseTheme(id)}
              className="justify-start rounded-lg"
            >
              <Icon aria-hidden /> {label}
              {theme === id && <Check className="ml-auto" aria-hidden />}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}