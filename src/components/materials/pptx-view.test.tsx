/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PptxView } from "@/components/materials/pptx-view";
import type { Deck } from "@/lib/office/pptx";

/**
 * The deck reader is deliberately small: the slide, two arrows and a counter.
 *
 * It used to draw a numbered button for every slide under the canvas, which on a
 * phone was a wall of digits louder than the slide itself. These tests exist so
 * that wall cannot come back quietly.
 */

function deckOf(count: number): Deck {
  return {
    width: 1280,
    height: 720,
    notes: ["Speaker notes belong to the presenter, not the reader."],
    slides: Array.from({ length: count }, (_, index) => ({
      number: index + 1,
      background: "#ffffff",
      shapes: [],
    })),
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // React 19 only wraps updates in `act` when the environment says so.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no ResizeObserver; the canvas measures itself with one.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function render(deck: Deck) {
  act(() => root.render(<PptxView deck={deck} />));
}

describe("the slide reader", () => {
  it("shows one slide and a quiet counter, not a button per slide", () => {
    render(deckOf(12));

    expect(container.textContent).toContain("1 / 12");
    expect(container.querySelectorAll("ol")).toHaveLength(0);
    expect(container.querySelector('[aria-label="Slide 7"]')).toBeNull();
    // Two arrows and nothing else to press.
    expect(container.querySelectorAll("button")).toHaveLength(2);
  });

  it("steps forward and back with those arrows", () => {
    render(deckOf(3));

    const next = container.querySelector<HTMLButtonElement>('[aria-label="Next slide"]');
    act(() => next?.click());
    expect(container.textContent).toContain("2 / 3");

    const previous = container.querySelector<HTMLButtonElement>('[aria-label="Previous slide"]');
    act(() => previous?.click());
    expect(container.textContent).toContain("1 / 3");
  });

  it("keeps the speaker's notes out of the reader", () => {
    const deck = deckOf(2);
    deck.notes = ["Ask the room about referral delays."];
    render(deck);

    expect(container.textContent).not.toContain("Ask the room");
  });

  it("drops the controls entirely for a one-slide deck", () => {
    render(deckOf(1));
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.textContent).not.toContain("/");
  });
});
