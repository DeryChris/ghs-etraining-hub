/**
 * Theme preference. "system" means no attribute is set and CSS follows the
 * operating system. The boot script runs before first paint, so a returning
 * visitor never sees the wrong theme flash.
 */
export const THEME_STORAGE_KEY = "ghs-theme";
export const THEME_CHANGE_EVENT = "ghs-theme-change";

export type ThemeChoice = "light" | "dark" | "system";

export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Storage can be blocked (private mode, embedded frames). Fall back to system.
    return "system";
  }
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", choice);
  }
  try {
    if (choice === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, choice);
    }
  } catch {
    // Without storage the choice still applies for this page view.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
