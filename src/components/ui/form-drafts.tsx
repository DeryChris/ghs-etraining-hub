"use client";

import { useEffect } from "react";

/**
 * Keeps what people have typed.
 *
 * A form that empties itself is a tax on whoever filled it in. Close the wrong
 * tab, lose the connection, get a validation message on field nine, hit the back
 * button — and the last ten minutes are gone. This component watches every form
 * on the page, saves its values while they are being typed, and puts them back
 * when the same form is shown again.
 *
 * It is deliberately one component rather than a wrapper around sixty-three
 * forms: a form opts in by existing. The key is derived from the page and the
 * names of the form's controls, which is stable across re-renders and across a
 * reload — and a form whose rows repeat (ten "Edit this area" dialogs) sets
 * `data-draft` to say which row it belongs to.
 *
 * What is never saved: passwords and file inputs. A password in sessionStorage
 * would outlive the tab it was typed in, and a file input cannot be restored
 * anyway.
 *
 * When a draft is cleared: on submit, once the page actually moves on (a redirect
 * or a closed overlay unmounts the form). A refused submission leaves the form
 * mounted, so the values stay — which is the point.
 */

const PREFIX = "ghs:draft:v1:";
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const SKIP_TYPES = new Set(["password", "file", "submit", "button", "reset", "image", "hidden"]);

interface SavedControl {
  name: string;
  type: string;
  value?: string;
  checked?: boolean;
  index?: number;
}

interface SavedForm {
  savedAt: number;
  controls: SavedControl[];
}

function draftKey(form: HTMLFormElement): string {
  const explicit = form.getAttribute("data-draft");
  if (explicit) return `${PREFIX}${location.pathname}|${explicit}`;
  const names = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[name]")]
    .filter((control) => !SKIP_TYPES.has((control as HTMLInputElement).type ?? ""))
    .slice(0, 6)
    .map((control) => control.name)
    .join(",");
  return `${PREFIX}${location.pathname}|${form.getAttribute("method") ?? "post"}|${names}`;
}

function controlsOf(form: HTMLFormElement) {
  return [...form.elements].filter((element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) {
      return false;
    }
    if (!element.name) return false;
    const type = element instanceof HTMLInputElement ? element.type : "";
    return !SKIP_TYPES.has(type);
  });
}

function save(form: HTMLFormElement) {
  const controls: SavedControl[] = [];
  const radioSeen = new Map<string, number>();
  for (const control of controlsOf(form)) {
    if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
      const index = radioSeen.get(control.name) ?? 0;
      radioSeen.set(control.name, index + 1);
      controls.push({ name: control.name, type: control.type, value: control.value, checked: control.checked, index });
      continue;
    }
    if (control instanceof HTMLSelectElement && control.multiple) {
      controls.push({
        name: control.name,
        type: "select-multiple",
        value: [...control.selectedOptions].map((option) => option.value).join("\u0001"),
      });
      continue;
    }
    controls.push({ name: control.name, type: control.type || control.tagName.toLowerCase(), value: control.value });
  }
  if (controls.length === 0) return;
  try {
    sessionStorage.setItem(draftKey(form), JSON.stringify({ savedAt: Date.now(), controls } satisfies SavedForm));
  } catch {
    // Storage full or blocked (private mode, quota): losing a draft is not worth
    // breaking the page over.
  }
}

function restore(form: HTMLFormElement) {
  let saved: SavedForm | null = null;
  try {
    const raw = sessionStorage.getItem(draftKey(form));
    if (!raw) return;
    saved = JSON.parse(raw) as SavedForm;
  } catch {
    return;
  }
  if (!saved || Date.now() - saved.savedAt > MAX_AGE_MS) return;

  const radioSeen = new Map<string, number>();
  for (const control of controlsOf(form)) {
    if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
      const index = radioSeen.get(control.name) ?? 0;
      radioSeen.set(control.name, index + 1);
      const match = saved.controls.find(
        (entry) => entry.name === control.name && entry.index === index && entry.value === control.value,
      );
      if (match) control.checked = match.checked === true;
      continue;
    }
    const entry = saved.controls.find((candidate) => candidate.name === control.name);
    if (!entry) continue;
    if (control instanceof HTMLSelectElement && control.multiple) {
      const chosen = new Set((entry.value ?? "").split("\u0001").filter(Boolean));
      for (const option of control.options) option.selected = chosen.has(option.value);
      continue;
    }
    if (control.value !== (entry.value ?? "")) control.value = entry.value ?? "";
  }
}

export function FormDrafts() {
  useEffect(() => {
    /* Forms that have been submitted once. Their draft is cleared when the page
     * moves on or the form goes away — i.e. when the submission took. */
    const submitted = new Set<string>();
    const restored = new WeakSet<HTMLFormElement>();

    const formsNow = () => [...document.querySelectorAll("form")];

    const restoreAll = () => {
      for (const form of formsNow()) {
        if (restored.has(form)) continue;
        restored.add(form);
        restore(form);
      }
    };

    const onInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const form = target.closest("form");
      if (form) save(form);
    };

    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      submitted.add(draftKey(form));
    };

    const onPageChange = () => {
      for (const key of submitted) {
        try {
          sessionStorage.removeItem(key);
        } catch {
          /* nothing sensible to do */
        }
      }
      submitted.clear();
    };

    // A dialog's form mounts after the page does, so restoration is driven by the
    // DOM rather than once at mount.
    const observer = new MutationObserver((mutations) => {
      let added = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element && (node.matches("form, dialog") || node.querySelector("form"))) added = true;
        }
        for (const node of mutation.removedNodes) {
          if (!(node instanceof Element)) continue;
          const gone = node.matches("form") ? [node] : [...node.querySelectorAll("form")];
          for (const form of gone) {
            if (!(form instanceof HTMLFormElement)) continue;
            const key = draftKey(form);
            if (!submitted.has(key)) continue;
            try {
              sessionStorage.removeItem(key);
            } catch {
              /* nothing sensible to do */
            }
            submitted.delete(key);
          }
        }
      }
      if (added) requestAnimationFrame(restoreAll);
    });

    restoreAll();
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("pagehide", onPageChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("pagehide", onPageChange);
    };
  }, []);

  return null;
}
