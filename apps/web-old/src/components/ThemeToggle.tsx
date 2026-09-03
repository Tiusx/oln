import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "icon" | "full";
  className?: string;
}

const KEY = "blog-theme";

function currentTheme(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function apply(theme: string) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  useEffect(() => {
    apply(currentTheme());
  }, []);

  const toggle = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    apply(next);
  };

  if (variant === "full") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        aria-label="切换明暗主题"
        className={cn("justify-start gap-2 w-full", className)}
      >
        <Sun className="h-4 w-4 dark:hidden" />
        <Moon className="hidden h-4 w-4 dark:block" />
        <span className="dark:hidden">暗色模式</span>
        <span className="hidden dark:inline">亮色模式</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="切换明暗主题"
      title="切换明暗主题"
      className={className}
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </Button>
  );
}
