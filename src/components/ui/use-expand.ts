"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Make this element the screen", with a fallback that always works.
 *
 * The obvious implementation is `requestFullscreen()`, and it is what the
 * resource panel used to call. It is also unavailable on iOS Safari for
 * anything that is not a `<video>`, and a browser may refuse it for reasons it
 * does not report — so on a phone the expand button did nothing at all, which
 * is exactly the device this product is used on.
 *
 * So the state is ours: `expanded` puts the element over the viewport with CSS,
 * and the browser's own full screen is asked for as a bonus. If it is refused
 * the panel is already on screen; if it succeeds, its own `fullscreenchange`
 * brings the two back into step.
 */
export function useExpand<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [expanded, setExpanded] = useState(false);
  const [native, setNative] = useState(false);

  // Native full screen can end by routes we never hear about otherwise — Escape,
  // the system back gesture, another tab taking it. Mirror whatever the browser
  // decided instead of assuming our button was the only way out.
  useEffect(() => {
    const onChange = () => {
      const isNative = document.fullscreenElement === ref.current;
      setNative(isNative);
      if (!isNative) setExpanded(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // CSS expansion has no Escape of its own.
  useEffect(() => {
    if (!expanded || native) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded, native]);

  // The page underneath must not scroll while the file owns the screen.
  useEffect(() => {
    if (!expanded) return;
    const { body, documentElement } = document;
    const bodyOverflow = body.style.overflow;
    const htmlOverflow = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    return () => {
      body.style.overflow = bodyOverflow;
      documentElement.style.overflow = htmlOverflow;
    };
  }, [expanded]);

  const toggle = useCallback(async () => {
    const element = ref.current;
    if (expanded) {
      setExpanded(false);
      if (document.fullscreenElement === element && typeof document.exitFullscreen === "function") {
        try {
          await document.exitFullscreen();
        } catch {
          // Already gone; the CSS state is what the visitor sees either way.
        }
      }
      return;
    }

    setExpanded(true);
    if (element && typeof element.requestFullscreen === "function") {
      try {
        await element.requestFullscreen();
      } catch {
        // Refused or unavailable (iOS Safari): the viewport-sized panel stands.
      }
    }
  }, [expanded]);

  return { ref, expanded, toggle };
}
