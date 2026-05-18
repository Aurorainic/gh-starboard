import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const icons = {
  auto: Monitor,
  dark: Moon,
  light: Sun,
};

const labels: Record<string, string> = {
  auto: "Auto",
  dark: "Dark",
  light: "Light",
};

export function ThemeToggle() {
  const { theme, cycle } = useTheme();
  const Icon = icons[theme];

  return (
    <button
      onClick={cycle}
      className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      title={`Theme: ${labels[theme]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
