"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useId, useSyncExternalStore } from "react";
import { applyTheme, readThemeChoice, THEME_CHANGE_EVENT, THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; Icon: LucideIcon }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
];

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) onChange();
  });
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function serverChoice(): ThemeChoice {
  return "system";
}

export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore(subscribe, readThemeChoice, serverChoice);
  const pillId = `${useId()}-theme-pill`;

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={`inline-flex items-center gap-0.5 rounded-[var(--radius-pill)] border border-hairline bg-surface p-1 ${className ?? ""}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => applyTheme(value)}
            className={`relative inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] transition-colors duration-fast sm:w-auto sm:gap-1.5 sm:px-2.5 ${
              active ? "text-primary-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                aria-hidden
                className="absolute inset-0 rounded-[var(--radius-pill)] bg-primary"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <Icon className="relative h-3.5 w-3.5" aria-hidden />
            <span className="relative hidden text-xs font-semibold sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
