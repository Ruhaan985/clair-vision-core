import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark";
const KEY = "lumen.theme.v1";

function applyTheme(t: Theme) {
  const el = document.documentElement;
  el.classList.toggle("light", t === "light");
  el.classList.toggle("dark", t === "dark");
  el.dataset.theme = t;
}

export function initThemeEarly() {
  if (typeof window === "undefined") return;
  const stored = (localStorage.getItem(KEY) as Theme | null) ?? "dark";
  applyTheme(stored);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Theme | null) ?? "dark";
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(KEY, t);
    applyTheme(t);
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}