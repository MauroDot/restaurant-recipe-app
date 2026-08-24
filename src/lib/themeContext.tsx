"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts at "dark" on both server and client so the FIRST render matches
  // (no hydration mismatch) — the effect below corrects it from
  // localStorage right after mount if it's actually "light". This
  // deliberately does NOT gate `children` behind a "mounted" flag: doing
  // that would render nothing for the whole app on every load until this
  // effect runs, which is a far worse regression than a one-frame label
  // flicker on the toggle button itself. The page's actual background
  // never flashes the wrong theme, because app/layout.tsx's
  // beforeInteractive <Script> already applies the "dark" class to <html>
  // before hydration — this state is only for the toggle's own label and
  // for future setTheme calls, not for hiding a flash that script already
  // prevents.
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    // Wrapped in an IIFE (matching authContext.tsx/RecipesList.tsx's own
    // effects elsewhere in this codebase) — react-hooks/set-state-in-effect
    // rejects a setState call directly at the top level of an effect body,
    // even one gated behind reading a browser-only external system like
    // localStorage that genuinely can't run during SSR.
    (() => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem("theme");
      } catch {
        // Can throw in some contexts (private browsing, storage disabled).
      }
      if (stored === "light" || stored === "dark") {
        setThemeState(stored);
      }
    })();
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Non-fatal — theme just won't persist across reloads this session.
    }
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
