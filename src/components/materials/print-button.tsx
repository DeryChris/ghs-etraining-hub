"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

/** The award is HTML, so "save as PDF" is the browser's own print dialogue — no server renderer. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass({ variant: "secondary" })}>
      <Printer className="h-4 w-4" aria-hidden />
      Print or save as PDF
    </button>
  );
}
