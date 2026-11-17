"use client";

import { useEffect } from "react";

/**
 * Reports one view of a published material. It posts once per mount and ignores
 * failures entirely: analytics must never block reading a protocol on a weak
 * connection, and the endpoint counts a view once per person per day anyway.
 * Do Not Track is honoured — a staff member who asked not to be counted is not
 * counted.
 */
export function ViewBeacon({ materialId }: { materialId: string }) {
  useEffect(() => {
    const dnt =
      navigator.doNotTrack === "1" ||
      (window as unknown as { doNotTrack?: string }).doNotTrack === "1";
    if (dnt) return;

    const controller = new AbortController();
    fetch(`/api/materials/${materialId}/view`, {
      method: "POST",
      keepalive: true,
      signal: controller.signal,
    }).catch(() => {});

    return () => controller.abort();
  }, [materialId]);

  return null;
}
