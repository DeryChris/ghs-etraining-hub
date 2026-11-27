"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Deck, Slide, SlideParagraph, SlideShape } from "@/lib/office/pptx";

/**
 * A deck, one slide at a time — the slide and two arrows.
 *
 * The previous version put a numbered button for every slide under the canvas,
 * which on a 40-slide deck was a wall of digits under a phone screen and the
 * loudest thing in the reader. A deck is read in order, so the controls are
 * *back*, *forward* and a quiet "3 / 40": no index, no speaker notes, no
 * furniture competing with the slide. Swiping works, because this is a phone
 * product and the canvas is the obvious thing to swipe.
 */
export function PptxView({ deck, expanded = false }: { deck: Deck; expanded?: boolean }) {
  const [index, setIndex] = useState(0);
  const total = deck.slides.length;
  const slide = deck.slides[Math.min(index, total - 1)];
  const touchStart = useRef<number | null>(null);

  const go = (next: number) => setIndex(Math.min(total - 1, Math.max(0, next)));

  return (
    <div className={expanded ? "flex h-full flex-col justify-center gap-3 p-2" : "space-y-3"}>
      <div
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (start === null) return;
          const end = event.changedTouches[0]?.clientX ?? start;
          const delta = end - start;
          // A deliberate sideways drag, not the start of a page scroll.
          if (Math.abs(delta) > 40) go(delta < 0 ? index + 1 : index - 1);
        }}
      >
        <SlideCanvas slide={slide} width={deck.width} height={deck.height} fit={expanded} />
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-1 px-1" aria-label="Slide controls">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous slide"
            title="Previous slide"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <p className="min-w-12 text-center text-xs font-semibold tabular-nums text-ink-muted" aria-live="polite">
            {index + 1} / {total}
          </p>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === total - 1}
            aria-label="Next slide"
            title="Next slide"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

function SlideCanvas({
  slide,
  width,
  height,
  fit = false,
}: {
  slide: Slide;
  width: number;
  height: number;
  /** Scale to the height as well as the width — the canvas is given the screen. */
  fit?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /*
   * The deck is measured at its own reference size, so it is drawn at that size
   * and scaled down. On the page the width decides; given the whole screen, the
   * shorter of width and height decides, so a 16:9 slide fits a portrait phone
   * whole rather than running off the bottom of it.
   */
  const byWidth = box.width > 0 ? box.width / width : 1;
  const scale = fit && box.height > 0 ? Math.min(byWidth, box.height / height) : byWidth;
  const left = Math.max(0, (box.width - width * scale) / 2);
  const top = Math.max(0, (box.height - height * scale) / 2);

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden rounded-control bg-surface-2 ${fit ? "min-h-0 flex-1" : ""}`}
      style={fit ? undefined : { aspectRatio: `${width} / ${height}` }}
    >
      <div
        style={{
          position: "absolute",
          top,
          left,
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: slide.background,
        }}
      >
        {slide.shapes.map((shape, position) => (
          <SlideShapeView key={position} shape={shape} />
        ))}
      </div>
    </div>
  );
}

function SlideShapeView({ shape }: { shape: SlideShape }) {
  const box = {
    position: "absolute" as const,
    left: shape.x,
    top: shape.y,
    width: shape.width,
    height: shape.height,
  };

  if (shape.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a data URL read from inside the .pptx
      <img src={shape.src} alt={shape.alt} style={{ ...box, objectFit: "contain" }} />
    );
  }

  if (shape.type === "shape") {
    if (shape.geometry === "line") {
      return (
        <div
          style={{
            ...box,
            borderTop: `1px solid ${shape.line ?? "#9ca3af"}`,
            height: 1,
          }}
        />
      );
    }
    return (
      <div
        style={{
          ...box,
          background: shape.fill ?? "transparent",
          border: shape.line ? `1px solid ${shape.line}` : undefined,
          borderRadius: shape.radius,
        }}
      />
    );
  }

  if (shape.type === "table") {
    return (
      <div style={{ ...box, display: "flex", flexDirection: "column" }}>
        {shape.rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            style={{ display: "flex", height: row.height || undefined, flex: row.height ? undefined : 1 }}
          >
            {row.cells.map((cell, cellIndex) => (
              <div
                key={cellIndex}
                style={{
                  width: shape.columns[cellIndex] ?? undefined,
                  flex: shape.columns[cellIndex] ? undefined : 1,
                  border: "1px solid #d1d5db",
                  padding: 6,
                  overflow: "hidden",
                }}
              >
                <Paragraphs paragraphs={cell} />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        ...box,
        background: shape.fill ?? "transparent",
        border: shape.line ? `1px solid ${shape.line}` : undefined,
        borderRadius: shape.radius,
        paddingTop: shape.inset.top,
        paddingRight: shape.inset.right,
        paddingBottom: shape.inset.bottom,
        paddingLeft: shape.inset.left,
        display: "flex",
        flexDirection: "column",
        justifyContent:
          shape.anchor === "middle" ? "center" : shape.anchor === "bottom" ? "flex-end" : "flex-start",
        overflow: "hidden",
      }}
    >
      <Paragraphs paragraphs={shape.paragraphs} />
    </div>
  );
}

function Paragraphs({ paragraphs }: { paragraphs: SlideParagraph[] }) {
  if (paragraphs.length === 0) return null;
  return (
    <>
      {paragraphs.map((paragraph, position) => {
        const first = paragraph.runs[0];
        const size = first?.size ?? 18;
        return (
          <p
            key={position}
            style={{
              margin: 0,
              marginTop: paragraph.spaceBefore ?? 0,
              textAlign: paragraph.align,
              lineHeight: paragraph.lineSpacing ? `${paragraph.lineSpacing * 1.2}` : 1.18,
              paddingLeft: paragraph.level * 18,
              fontSize: size,
              color: first?.color ?? "#111827",
              display: "flex",
              gap: 6,
              alignItems: "baseline",
            }}
          >
            {paragraph.bullet && (
              <span aria-hidden style={{ fontSize: size * 0.7, lineHeight: 1 }}>
                {paragraph.numbered ? "1." : "•"}
              </span>
            )}
            <span>
              {paragraph.runs.map((run, runIndex) => (
                <span
                  key={runIndex}
                  style={{
                    fontWeight: run.bold ? 700 : 400,
                    fontStyle: run.italic ? "italic" : undefined,
                    textDecoration: run.underline ? "underline" : undefined,
                    color: run.color ?? undefined,
                    background: run.highlight ?? undefined,
                    fontFamily: run.font ?? undefined,
                  }}
                >
                  {run.text}
                </span>
              ))}
            </span>
          </p>
        );
      })}
    </>
  );
}
