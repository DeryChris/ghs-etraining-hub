"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FileUp, UploadCloud, X } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { hintClass, labelClass } from "@/components/ui/input";

/**
 * A file field people can drop onto.
 *
 * Every upload in the application used to be a bare `<input type="file">` — a
 * grey button whose real drop target was a few characters wide, even though the
 * browser accepts a drop anywhere on the page. This draws the target: a dashed
 * box that lights up while a file is over it, shows what was chosen, and can be
 * cleared. The native input is still there (visually hidden but focusable through
 * the label), so keyboard users, no-JS submission and server-action forms behave
 * exactly as before — a drop is written back into it with a DataTransfer, which
 * is the only way to make a dragged file part of a normal form submission.
 */
export function FileDrop({
  id,
  name,
  accept,
  required,
  disabled,
  label = "File",
  hint,
  onFile,
  className = "",
}: {
  id: string;
  name: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: ReactNode;
  /**
   * Told about every choice, including a drop and a clear. Forms that upload with
   * fetch and keep the File in state use this; forms that post natively can omit
   * it and rely on the input's own `files`.
   */
  onFile?: (file: File | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [over, setOver] = useState(false);

  const accept_ = useCallback(
    (file: File | null) => {
      setPicked(file);
      onFile?.(file);
    },
    [onFile],
  );

  /* A form reset (after a successful upload) empties the input; empty this too. */
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const clear = () => {
      setPicked(null);
      onFile?.(null);
    };
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, [onFile]);

  function take(files: FileList | null) {
    const file = files?.[0] ?? null;
    if (!file) return;
    const input = inputRef.current;
    if (input) {
      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
      } catch {
        // No DataTransfer (very old browser): the file still reaches `onFile`,
        // and a native form submission will simply ask for it again.
      }
    }
    accept_(file);
  }

  function clear() {
    const input = inputRef.current;
    if (input) input.value = "";
    accept_(null);
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <span className={labelClass}>{label}</span>

      <div
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setOver(true);
        }}
        onDragEnter={(event) => {
          if (disabled) return;
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={(event) => {
          // Leaving for a child element is not leaving the zone.
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setOver(false);
        }}
        onDrop={(event) => {
          if (disabled) return;
          event.preventDefault();
          setOver(false);
          take(event.dataTransfer.files);
        }}
        className={`rounded-control border-2 border-dashed px-4 py-6 text-center transition-colors ${
          disabled
            ? "border-hairline bg-surface-2/40 opacity-60"
            : over
              ? "border-primary bg-primary/10"
              : picked
                ? "border-primary/40 bg-primary/5"
                : "border-hairline bg-surface-2/40 hover:border-primary/40 hover:bg-surface-2/70"
        }`}
      >
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          required={required}
          disabled={disabled}
          className="peer sr-only"
          onChange={(event) => accept_(event.target.files?.[0] ?? null)}
        />

        <label
          htmlFor={id}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-control outline-offset-4 peer-focus-visible:outline-2 peer-focus-visible:outline-primary ${
            disabled ? "cursor-not-allowed" : ""
          }`}
        >
          {picked ? (
            <>
              <FileUp className="h-6 w-6 text-primary" aria-hidden />
              <span className="max-w-full truncate text-sm font-semibold text-ink">{picked.name}</span>
              <span className="text-xs text-ink-muted">
                {formatBytes(picked.size)} · {over ? "drop to replace" : "drop another file or click to change"}
              </span>
            </>
          ) : (
            <>
              <UploadCloud className={`h-6 w-6 ${over ? "text-primary" : "text-ink-muted"}`} aria-hidden />
              <span className="text-sm font-semibold text-ink">
                {over ? "Drop it here" : "Drag a file here, or click to choose"}
              </span>
              <span className="text-xs text-ink-muted">One file at a time</span>
            </>
          )}
        </label>
      </div>

      {picked && !disabled && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Choose a different file
        </button>
      )}

      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}
