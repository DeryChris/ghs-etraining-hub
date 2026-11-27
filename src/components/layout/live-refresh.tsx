"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a working queue honest while it is open.
 *
 * The queue pages used to be snapshots: a decision taken in another tab, a
 * facilitator filing a training, an administrator granting a field — none of it
 * showed up until someone pressed reload, so the app felt switched off while work
 * was happening on the other side of it. This asks the server for the page again
 * on a slow timer, and immediately when the tab comes back into view.
 *
 * It refreshes only while the tab is visible, and the interval is deliberately
 * slower than any human decision, so a queue left open on a wall display does not
 * become a load source.
 */
export function LiveRefresh({ label, seconds = 45 }: { label: string; seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: number | undefined;

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    };

    const start = () => {
      stop();
      timer = window.setInterval(refresh, seconds * 1000);
    };

    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Coming back to the tab is the moment the stale queue is most obvious.
        refresh();
        start();
      } else {
        stop();
      }
    };

    start();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, seconds, label]);

  return null;
}
