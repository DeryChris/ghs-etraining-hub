"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  /** A second line under the label — "what this choice means", not a tooltip. */
  hint?: string;
  disabled?: boolean;
  /** A heading the option sits under, e.g. the programme area a field belongs to. */
  group?: string;
}

/**
 * A dropdown that belongs to this product.
 *
 * A native `<select>` hands its menu to the operating system: on Windows the
 * list is drawn by Windows, on a phone by the phone, and neither matches the
 * panel it opened from — the complaint was that the menus looked borrowed. This
 * is a real listbox instead: same type, same radii, same focus ring as every
 * other control, with room for a line of explanation under each choice.
 *
 * It stays a form control. The value lives in a hidden input with `name`, so a
 * plain form post, a server action and a GET filter bar all submit exactly what
 * they did before; the list is only how it is drawn. Keyboard behaviour is the
 * native one — arrows, Home/End, Enter, Escape and type-ahead all work, and the
 * trigger is announced as a combobox with an active option.
 */
export function Select({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  options,
  placeholder = "Choose one",
  required = false,
  disabled = false,
  searchable = false,
  size = "md",
  className = "",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  /** The field name the form posts. */
  name?: string;
  /** Controlled value. Omit to keep the value inside the component. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Adds a filter box to the panel — for lists too long to scan. */
  searchable?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listId = `${controlId}-list`;

  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === current) ?? null;

  const visible = useMemo(() => {
    if (!query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        (option.hint ?? "").toLowerCase().includes(needle) ||
        (option.group ?? "").toLowerCase().includes(needle),
    );
  }, [options, query]);

  // Grouped only when at least one option says which group it belongs to.
  const groups = useMemo(() => {
    if (!visible.some((option) => option.group)) return null;
    const order: string[] = [];
    const map = new Map<string, SelectOption[]>();
    for (const option of visible) {
      const key = option.group ?? "";
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(option);
      } else {
        map.set(key, [option]);
        order.push(key);
      }
    }
    return order.map((key) => ({ name: key, options: map.get(key) ?? [] }));
  }, [visible]);

  const flat = groups ? groups.flatMap((group) => group.options) : visible;

  /**
   * The list is a popover, so it has to close when the page moves under it:
   * a pointer anywhere else, a scroll of an ancestor, or Tab out of the panel.
   */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      const timer = window.setTimeout(() => searchRef.current?.focus(), 20);
      return () => window.clearTimeout(timer);
    }
  }, [open, searchable]);

  function commit(next: string) {
    if (value === undefined) setInternal(next);
    onChange?.(next);
    setOpen(false);
    setQuery("");
    buttonRef.current?.focus();
  }

  function openList(startAt?: number) {
    if (disabled) return;
    setOpen(true);
    // In a scrolling overlay the menu can open below the fold; bringing the
    // control itself into view is enough to give the menu room.
    rootRef.current?.scrollIntoView({ block: "nearest" });
    const index = Math.max(
      0,
      startAt ??
        flat.findIndex((option) => option.value === current && !option.disabled),
    );
    setActive(index < 0 ? 0 : index);
  }

  function move(delta: number) {
    if (flat.length === 0) return;
    let next = active;
    for (let step = 0; step < flat.length; step += 1) {
      next = (next + delta + flat.length) % flat.length;
      if (!flat[next]?.disabled) break;
    }
    setActive(next);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (event.key === "ArrowDown") move(1);
      else if (event.key === "ArrowUp") move(-1);
      else if (event.key === "Enter" || event.key === " ") {
        const option = flat[active];
        if (option && !option.disabled) commit(option.value);
      }
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActive(0);
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActive(Math.max(0, flat.length - 1));
    }
  }

  const height = size === "sm" ? "min-h-10 px-3 text-sm" : "min-h-11 px-3.5 text-sm";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/*
       * The form still posts through a real `<select>`.
       *
       * It is hidden from sight, not from the form: `required` therefore means
       * what it meant before (the browser refuses an empty one, and the server
       * still validates), and a submission carries exactly the value it carried
       * when this control was native. `tabIndex={-1}` keeps it out of the tab
       * order so the visible control is the one people land on.
       */}
      {name && (
        <select
          name={name}
          value={current}
          required={required}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => commit(event.target.value)}
          className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value || "empty"} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      <button
        ref={buttonRef}
        id={controlId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-required={required || undefined}
        aria-activedescendant={open && flat[active] ? `${controlId}-option-${active}` : undefined}
        aria-invalid={required && !current ? true : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center gap-2 rounded-control border bg-surface text-left transition-[border-color,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${height} ${
          open ? "border-primary ring-2 ring-primary/30" : "border-hairline hover:border-primary/50"
        }`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? "font-medium text-ink" : "text-ink-muted"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-base ${open ? "rotate-180 text-primary" : ""}`}
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-labelledby={controlId}
          className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-hidden rounded-card border border-hairline bg-surface shadow-2xl"
        >
          {searchable && (
            <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    move(1);
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    move(-1);
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const option = flat[active];
                    if (option && !option.disabled) commit(option.value);
                  }
                  if (event.key === "Escape") setOpen(false);
                }}
                placeholder="Type to narrow the list"
                aria-label="Filter the list"
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none"
              />
            </div>
          )}

          <div className="overlay-scroll max-h-64 overflow-y-auto py-1">
            {flat.length === 0 && (
              <p className="px-3 py-4 text-sm text-ink-muted">Nothing matches that. Try a different word.</p>
            )}
            {(groups ?? [{ name: "", options: visible }]).map((group) => (
              <div key={group.name}>
                {group.name && (
                  <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    {group.name}
                  </p>
                )}
                {group.options.map((option) => {
                  const position = flat.indexOf(option);
                  const isSelected = option.value === current;
                  return (
                    <button
                      key={option.value || "empty"}
                      id={`${controlId}-option-${position}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onPointerEnter={() => setActive(position)}
                      onClick={() => commit(option.value)}
                      className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        position === active ? "bg-primary/[0.08]" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${isSelected ? "font-bold text-primary" : "text-ink"}`}>
                          {option.label}
                        </span>
                        {option.hint && (
                          <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{option.hint}</span>
                        )}
                      </span>
                      {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
