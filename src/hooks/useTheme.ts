import { useState, useEffect } from "react";

type Theme = "auto" | "dark" | "light";

function getSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const isDark = theme === "dark" || (theme === "auto" && getSystemDark());
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light" || saved === "auto") return saved;
    return "auto";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);

    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("auto");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  const cycle = () => {
    setThemeState((prev) => {
      if (prev === "auto") return "dark";
      if (prev === "dark") return "light";
      return "auto";
    });
  };

  const setTheme = (t: Theme) => setThemeState(t);

  return { theme, cycle, setTheme };
}
