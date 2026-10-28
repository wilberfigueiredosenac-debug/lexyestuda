import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const A11Y_SIZE_KEY = "lexy-font-size";
export const A11Y_READABLE_KEY = "lexy-readable";
const SIZES = [90, 100, 112, 125];

function apply(size: number, readable: boolean) {
  const root = document.documentElement;
  root.style.fontSize = `${size}%`;
  root.dataset["readable"] = readable ? "on" : "off";
}

export function AccessibilityControls() {
  const [size, setSize] = useState(100);
  const [readable, setReadable] = useState(false);

  useEffect(() => {
    setSize(Number(localStorage.getItem(A11Y_SIZE_KEY)) || 100);
    setReadable(localStorage.getItem(A11Y_READABLE_KEY) === "on");
  }, []);

  function update(nextSize: number, nextReadable: boolean) {
    setSize(nextSize);
    setReadable(nextReadable);
    localStorage.setItem(A11Y_SIZE_KEY, String(nextSize));
    localStorage.setItem(A11Y_READABLE_KEY, nextReadable ? "on" : "off");
    apply(nextSize, nextReadable);
  }

  const idx = SIZES.indexOf(size);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={idx <= 0} onClick={() => update(SIZES[idx - 1] ?? 100, readable)} aria-label="Diminuir letra">
          A−
        </Button>
        <span className="w-12 text-center text-sm font-bold">{size}%</span>
        <Button variant="outline" size="sm" disabled={idx >= SIZES.length - 1} onClick={() => update(SIZES[idx + 1] ?? 100, readable)} aria-label="Aumentar letra">
          A+
        </Button>
      </div>
      <Button variant={readable ? "default" : "outline"} size="sm" onClick={() => update(size, !readable)} aria-pressed={readable}>
        Letra fácil de ler {readable ? "(ligada)" : ""}
      </Button>
    </div>
  );
}
