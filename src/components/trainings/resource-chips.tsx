import { Download, FileText } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { extensionForMime } from "@/lib/file-name";

export interface ResourceChip {
  id: string;
  title: string;
  mimeType: string | null;
  sizeBytes: number | null;
  /** A signed link that downloads the file; null when the object is missing. */
  href: string | null;
}

/**
 * The files under a training, as chips rather than a table.
 *
 * A deck, a report and a recording are three things you either want or you do not;
 * a row each with a name, a badge and a download arrow says that in one line. The
 * badge carries the real extension from the stored MIME type, so a video is never
 * labelled "PDF" because somebody typed the title that way.
 */
export function ResourceChips({ resources }: { resources: ResourceChip[] }) {
  if (resources.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-hairline bg-surface-2/60 px-4 py-5 text-sm text-ink-muted">
        No files attached yet. A deck, the attendance sheet or a report can be added from the Resources panel below.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-3">
      {resources.map((resource) => {
        const extension = extensionForMime(resource.mimeType);
        const label = resource.title.length > 0 ? resource.title : "Attachment";
        return (
          <li key={resource.id}>
            <a
              href={resource.href ?? undefined}
              aria-disabled={resource.href ? undefined : true}
              className="group flex min-w-[11rem] max-w-[19rem] items-center gap-3 rounded-control border border-hairline bg-surface px-3 py-2.5 shadow-panel transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-disabled:opacity-60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{label}</span>
                <span className="block text-[11px] uppercase tracking-wider text-ink-muted">
                  {extension ? extension.toUpperCase() : "FILE"}
                  {resource.sizeBytes !== null ? ` · ${formatBytes(resource.sizeBytes)}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-ink-muted transition-colors group-hover:text-primary">
                <Download className="h-4 w-4" aria-hidden />
                <span className="sr-only">Download {label}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
