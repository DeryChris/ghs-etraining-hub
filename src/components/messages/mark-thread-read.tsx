"use client";

import { useEffect } from "react";
import { markThreadReadAction } from "@/lib/server/actions/messages";

/** Marks an open conversation as read. Lives in an effect, never in render. */
export function MarkThreadRead({ counterpartId }: { counterpartId: string }) {
  useEffect(() => {
    void markThreadReadAction(counterpartId);
  }, [counterpartId]);
  return null;
}
