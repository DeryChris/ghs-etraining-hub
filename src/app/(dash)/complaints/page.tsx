import { redirect } from "next/navigation";

/**
 * Complaints used to have their own screen in the sidebar.
 *
 * They are one thread type in the merged inbox now (ADR‑0029), so this route is
 * kept only to resolve links that already exist — in notices, in the help pages
 * and in anything sent before the merge — and sends the reader to the complaints
 * half of that inbox.
 */
export default function ComplaintsPage() {
  redirect("/messages?show=complaints");
}
