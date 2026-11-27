"use client";

import { useEffect, useRef, useState } from "react";
import type { Deck, Slide, SlideParagraph, SlideShape } from "@/lib/office/pptx";

/**
 * A slide, drawn at the author's coordinates.
 *
 * The deck is measured in pixels at its own reference size (1280 wide for a
 * 16:9 deck), and the whole canvas is scaled to whatever width it is given — so
 * the title stays where it was dragged to, the accent band keeps its height and
 * the picture keeps its place beside the bullet. Nothing here is a quotation of
 * the slide; it is the slide.
 */
export function PptxView({ deck }: { deck: Deck }) {
  const [index, setIndex] = useState(0);
  const slide = deck.slides[Math.min(index, deck.slides.length - 1)];

  return (
    <div className="space-y-3">
      <SlideCanvas slide={slide} width={deck.width} height={deck.height} />

      {deck.slides.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              disabled={index === 0}
              className="inline-flex h-8 items-center rounded-control border border-hairline px-2.5 text-xs font-semibold text-ink transition-colors hover:border-primary/40 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setIndex((current) => Math.min(deck.slides.length - 1, current + 1))}
              disabled={index === deck.slides.length - 1}
              className="inline-flex h-8 items-center rounded-control border border-hairline px-2.5 text-xs font-semibold text-ink transition-colors hover:border-primary/40 disabled:opacity-40"
            >
              Next
            </button>
          </div>
          <p className="text-xs font-semibold text-ink-muted" aria-live="polite">
            Slide {index + 1} of {deck.slides.length}
          </p>
        </div>
      )}

      {deck.slides.length > 1 && (
        <ol className="flex flex-wrap gap-1.5 px-1" aria-label="Slides">
          {deck.slides.map((entry, position) => (
            <li key={entry.number}>
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-current={position === index ? "true" : undefined}
                aria-label={`Slide ${entry.number}`}
                className={`flex h-7 min-w-7 items-center justify-center rounded-control border px-2 text-[11px] font-bold transition-colors ${
                  position === index
                    ? "border-primary bg-primary text-primary-ink"
                    : "border-hairline bg-surface text-ink-muted hover:border-primary/40 hover:text-ink"
                }`}
              >
                {entry.number}
              </button>
            </li>
          ))}
        </ol>
      )}

      {deck.notes.length > 0 && (
        <p className="px-1 text-[11px] leading-relaxed text-ink-muted">{deck.notes.join(" ")}</p>
      )}
    </div>
  );
}

function SlideCanvas({ slide, width, height }: { slide: Slide; width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setScale(element.clientWidth / width || 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-control bg-surface-2"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
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
