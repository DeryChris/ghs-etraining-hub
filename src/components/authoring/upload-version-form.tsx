"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { MAX_UPLOAD_BYTES, MIME_ALLOWLIST } from "@/lib/ghs-constants";
import { formatBytes } from "@/lib/format";
import { finaliseUploadAction, requestUploadAction } from "@/lib/server/actions/authoring";

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const ACCEPT = MIME_ALLOWLIST.join(",");

/**
 * Three steps, one screen: ask the server for a signed slot, send the bytes
 * straight to storage, then ask the server to record the version. The file never
 * passes through this application's server, so a 250 MB video is no different
 * from a 1 MB memo.
 */
export function UploadVersionForm({ materialId }: { materialId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const largest = Math.max(...Object.values(MAX_UPLOAD_BYTES));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage({ ok: false, text: "Choose a file first." });
      return;
    }

    const changeNote = new FormData(event.currentTarget).get("changeNote");

    setMessage(null);
    setStatus("uploading");

    const target = await requestUploadAction({
      materialId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });
    if (!target.ok) {
      setStatus("idle");
      setMessage({ ok: false, text: target.message });
      return;
    }

    let checksum: string;
    try {
      checksum = await sha256Hex(file);
      const response = await fetch(target.uploadUrl, {
        method: "PUT",
        // S3 rejects a PUT whose content-type differs from the one the signature
        // covers; x-upsert was a Supabase Storage convention and is gone.
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    } catch {
      setStatus("idle");
      setMessage({ ok: false, text: "The upload did not finish. Check your connection and try again." });
      return;
    }

    setStatus("saving");
    const data = new FormData();
    data.set("materialId", materialId);
    data.set("versionId", target.versionId);
    data.set("storageKey", target.storageKey);
    data.set("checksumSha256", checksum);
    if (typeof changeNote === "string") data.set("changeNote", changeNote);

    const result = await finaliseUploadAction({ ok: false, message: null }, data);
    setStatus("idle");
    setMessage({ ok: result.ok, text: result.message ?? "" });
    if (result.ok) {
      setFile(null);
      formRef.current?.reset();
      router.refresh();
    }
  }

  const busy = status !== "idle";

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="upload-file" className={labelClass}>
          File
        </label>
        <input
          id="upload-file"
          name="file"
          type="file"
          accept={ACCEPT}
          required
          disabled={busy}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className={`${inputClass} file:mr-3 file:rounded-control file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink`}
        />
        <p className={hintClass}>
          Accepted: {MIME_ALLOWLIST.join(", ")}. Up to {formatBytes(largest)} depending on the type. Files are scanned
          before a learner can open them.
        </p>
      </div>

      <div>
        <label htmlFor="upload-note" className={labelClass}>
          What changed? <span className="normal-case tracking-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="upload-note"
          name="changeNote"
          maxLength={500}
          disabled={busy}
          placeholder="e.g. Updated malaria treatment threshold to 2026 guidance"
          className={inputClass}
        />
      </div>

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded-control border px-3 py-2 text-sm ${message.ok ? "border-primary/30 bg-primary/10 text-primary" : "border-danger/40 bg-danger/10 text-danger"}`}
        >
          {message.text}
        </p>
      )}

      <button type="submit" disabled={busy || !file} aria-busy={busy} className={buttonClass()}>
        <UploadCloud className="h-4 w-4" aria-hidden />
        {status === "uploading" ? "Uploading…" : status === "saving" ? "Saving version…" : "Upload version"}
      </button>
    </form>
  );
}
