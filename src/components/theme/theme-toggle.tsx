"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  applyTheme,
  readThemeChoice,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

/*
 * One button, two states. The icon shows what the *next* click gives you —
 * a moon while the page is light, a sun while it is dark — and the accessible
 * name says the same thing in words. An earlier three-way pill (light / system /
 * dark) asked the visitor to read a control before using it; "system" is still
 * honoured as the starting point, it is just no longer something to choose.
 */

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) onChange();
  });
  query.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    query.removeEventListener("change", onChange);
  };
}

/** The stored choice, or "system" when the visitor has never picked one. */
function readStored() {
  return readThemeChoice();
}

/** Whether the operating system is dark. Constant on the server. */
function readSystemDark() {
  return window.matchMedia(DARK_QUERY).matches;
}

export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore(
    subscribe,
    readStored,
    () => "system" as const,
  );
  const systemDark = useSyncExternalStore(
    subscribe,
    readSystemDark,
    () => false,
  );

  const dark = choice === "system" ? systemDark : choice === "dark";
  const label = dark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => applyTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-control border border-hairline bg-surface text-ink-muted transition-colors duration-fast hover:border-primary/40 hover:text-ink ${className ?? ""}`}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={dark ? "moon" : "sun"}
          initial={{ opacity: 0, rotate: -35, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 35, scale: 0.7 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex"
        >
          {dark ? (
            <Sun className="h-4 w-4" aria-hidden />
          ) : (
            <Moon className="h-4 w-4" aria-hidden />
          )}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only">
        {dark ? "Dark theme is on" : "Light theme is on"}
      </span>
    </button>
  );
}
