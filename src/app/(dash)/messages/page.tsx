import Link from "next/link";
import { MessagesSquare, ShieldAlert } from "lucide-react";
import { ComposeMessage, type Recipient } from "@/components/messages/compose-message";
import { MarkThreadRead } from "@/components/messages/mark-thread-read";
import { ComplaintCard } from "@/components/complaints/complaint-card";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { ROLE_LABELS } from "@/lib/labels";
import { firstNameOf } from "@/lib/names";
import { getThread, listConversations, listDirectory } from "@/lib/server/messaging-queries";
import {
  listComplaints,
  messagesByComplaint,
  openComplaintCount,
  type ComplaintMessage,
} from "@/lib/server/complaint-queries";
import { requireSession } from "@/lib/server/rbac";
import { mapLimit, withDeadline } from "@/lib/server/page-data";

function parseBefore(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

type Show = "ALL" | "MESSAGES" | "COMPLAINTS";

const TABS: { key: Show; label: string; param: string }[] = [
  { key: "ALL", label: "All", param: "all" },
  { key: "MESSAGES", label: "Messages", param: "messages" },
  { key: "COMPLAINTS", label: "Complaints", param: "complaints" },
];

/**
 * One inbox for both kinds of correspondence.
 *
 * Messages and complaints were two destinations in the sidebar and two mental
 * models for the same question — "what has been said to me, and what did I say
 * back". A facilitator answered a complaint, then changed screens to answer a
 * colleague, and the bell counted the two separately. They are one list now:
 * every thread carries a chip saying what it is, and three buttons above the list
 * narrow it without moving anything else on the page.
 *
 * There is no separate complaints screen. Choosing a complaint opens it in the
 * same right-hand pane a conversation opens in. `/complaints` still resolves,
 * because notices and help pages link to it.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string; before?: string; show?: string; complaint?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const withParam = params.with;
  const before = parseBefore(params.before);
  const show: Show = params.show === "messages" ? "MESSAGES" : params.show === "complaints" ? "COMPLAINTS" : "ALL";

  // The complaint desk is staff work; a learner's inbox is their conversations.
  const mayHandleComplaints = session.role !== "LEARNER";

  const loaded = await withDeadline("messages", () =>
    mapLimit([
      () => listConversations(session.sub),
      () => listDirectory(session.sub),
      () => (mayHandleComplaints ? listComplaints("ALL") : Promise.resolve([])),
      () => (mayHandleComplaints ? openComplaintCount() : Promise.resolve(0)),
    ]),
  );
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="Messages did not load"
        description="Conversations, complaints and the staff directory could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
      />
    );
  }
  const [conversations, directory, complaintRows, openComplaints] = loaded.data;

  const activeId = isUuid(withParam) ? withParam : null;
  const thread = activeId ? await getThread(session.sub, activeId, { before }) : null;

  const activeComplaintId = isUuid(params.complaint) ? params.complaint : null;
  const activeComplaint = activeComplaintId ? complaintRows.find((row) => row.id === activeComplaintId) : undefined;

  // The thread under the open complaint, read only when one is open.
  const complaintThreads = await messagesByComplaint(activeComplaint ? [activeComplaint.id] : []).catch(
    (): Map<string, ComplaintMessage[]> => new Map(),
  );

  const recipients: Recipient[] = directory.map((person) => ({
    id: person.id,
    name: person.fullName,
    role: person.role,
    facility: person.facility,
  }));

  interface FeedItem {
    kind: "MESSAGE" | "COMPLAINT";
    at: Date;
    id: string;
    title: string;
    snippet: string;
    unread: number;
    href: string;
    resolved?: boolean;
  }

  const feed: FeedItem[] = [
    ...conversations.map(
      (conversation): FeedItem => ({
        kind: "MESSAGE",
        at: conversation.lastAt,
        id: conversation.counterpartId,
        title: conversation.counterpartName,
        snippet: conversation.lastBody,
        unread: conversation.unread,
        href: `/messages?show=${show.toLowerCase()}&with=${conversation.counterpartId}`,
      }),
    ),
    ...complaintRows.map(
      (row): FeedItem => ({
        kind: "COMPLAINT",
        at: row.createdAt,
        id: row.id,
        title: `${row.reference} · ${row.subject}`,
        snippet: row.fullName,
        unread: 0,
        href: `/messages?show=complaints&complaint=${row.id}`,
        resolved: row.status === "RESOLVED",
      }),
    ),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const visible = feed.filter((item) => {
    if (show === "ALL") return true;
    return show === "MESSAGES" ? item.kind === "MESSAGE" : item.kind === "COMPLAINT";
  });

  const messageCount = feed.filter((item) => item.kind === "MESSAGE").length;
  const complaintCount = feed.filter((item) => item.kind === "COMPLAINT").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Secure staff messaging"
        title="Messages & complaints"
        description="Talk to colleagues across GHS facilities and answer what staff have reported — one list, with a chip on each thread. Keep messages to work matters and never include patient information."
      />

      <nav aria-label="What to show" className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const active = show === tab.key;
          const count = tab.key === "MESSAGES" ? messageCount : tab.key === "COMPLAINTS" ? complaintCount : feed.length;
          return (
            <Link
              key={tab.key}
              href={`/messages?show=${tab.param}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-ink"
                  : "border-hairline bg-surface text-ink-muted hover:border-primary/40 hover:text-ink"
              }`}
            >
              {tab.label}
              <span className={`text-[11px] font-bold ${active ? "text-primary-ink/75" : "text-ink-muted"}`}>{count}</span>
            </Link>
          );
        })}
        {mayHandleComplaints && openComplaints > 0 && (
          <p className="ml-auto text-xs font-semibold text-danger" aria-live="polite">
            {openComplaints} complaint{openComplaints === 1 ? "" : "s"} still open
          </p>
        )}
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="inbox-heading" className="space-y-6 lg:col-span-1">
          {show !== "COMPLAINTS" && (
            <div className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
              <h2 className="mb-4 text-sm font-semibold text-ink">New message</h2>
              <ComposeMessage recipients={recipients} />
            </div>
          )}

          <div className="space-y-3">
            <h2 id="inbox-heading" className="text-sm font-semibold text-ink">
              Inbox
            </h2>

            {visible.length === 0 ? (
              <ListEmptyState
                title={
                  show === "COMPLAINTS"
                    ? "No complaints"
                    : show === "MESSAGES"
                      ? "No conversations yet"
                      : "Nothing here yet"
                }
                description={
                  show === "COMPLAINTS"
                    ? "Complaints lodged from the public Complaint Hub are filed here, each with the answer that was given."
                    : "Choose a colleague above to start a conversation."
                }
              />
            ) : (
              <ul className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
                {visible.map((item) => {
                  const active = item.kind === "MESSAGE" ? item.id === activeId : item.id === activeComplaintId;
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <Link
                        href={item.href}
                        aria-current={active ? "true" : undefined}
                        className={`block p-4 transition-colors ${active ? "bg-primary/10" : "hover:bg-surface-2"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                              item.kind === "COMPLAINT" ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
                            }`}
                          >
                            {item.kind === "COMPLAINT" ? (
                              <ShieldAlert className="h-3 w-3" aria-hidden />
                            ) : (
                              <MessagesSquare className="h-3 w-3" aria-hidden />
                            )}
                            {item.kind === "COMPLAINT" ? "Complaint" : "Message"}
                          </span>
                          {item.resolved && (
                            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">Resolved</span>
                          )}
                          {item.unread > 0 && (
                            <span className="ml-auto min-w-5 rounded-full bg-primary px-1.5 text-center text-[10px] font-bold leading-5 text-primary-ink">
                              <span className="sr-only">Unread: </span>
                              {item.unread}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 truncate text-sm font-semibold text-ink">{item.title}</p>
                        <p className="truncate text-xs text-ink-muted">{item.snippet}</p>
                        <p className="mt-1 text-[11px] text-ink-muted">{formatDateTime(item.at)}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section
          aria-label={activeComplaint ? "Complaint" : "Conversation"}
          className="flex min-h-[32rem] flex-col rounded-card border border-hairline bg-surface shadow-panel lg:col-span-2"
        >
          {activeComplaint ? (
            <div className="p-5">
              <ComplaintCard
                complaint={{
                  id: activeComplaint.id,
                  reference: activeComplaint.reference,
                  staffId: activeComplaint.staffId,
                  fullName: activeComplaint.fullName,
                  email: activeComplaint.email,
                  phone: activeComplaint.phone,
                  region: activeComplaint.region,
                  facility: activeComplaint.facility,
                  issueType: activeComplaint.issueType,
                  trainingTitle: activeComplaint.trainingTitle,
                  subject: activeComplaint.subject,
                  description: activeComplaint.description,
                  status: activeComplaint.status,
                  response: activeComplaint.response,
                  createdAt: activeComplaint.createdAt.toISOString(),
                  resolvedAt: activeComplaint.resolvedAt ? activeComplaint.resolvedAt.toISOString() : null,
                  messages: (complaintThreads.get(activeComplaint.id) ?? []).map((message) => ({
                    id: message.id,
                    authorRole: message.authorRole,
                    authorName: message.authorName,
                    body: message.body,
                    createdAt: message.createdAt.toISOString(),
                  })),
                }}
              />
            </div>
          ) : thread ? (
            <>
              <MarkThreadRead counterpartId={thread.counterpart.id} />
              <header className="border-b border-hairline p-5">
                <p className="font-semibold text-ink">{thread.counterpart.fullName}</p>
                <p className="text-xs text-ink-muted">
                  {ROLE_LABELS[thread.counterpart.role as keyof typeof ROLE_LABELS]}
                  {thread.counterpart.facility ? ` · ${thread.counterpart.facility}` : ""}
                </p>
              </header>

              {thread.hasMore && thread.oldestAt && (
                <div className="border-b border-hairline px-5 py-3 text-center">
                  <Link
                    href={`/messages?with=${thread.counterpart.id}&before=${encodeURIComponent(thread.oldestAt.toISOString())}`}
                    className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Load earlier messages
                  </Link>
                </div>
              )}

              <ol className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
                {thread.messages.length === 0 && (
                  <li className="py-10 text-center text-sm text-ink-muted">
                    No messages yet. Say hello to {firstNameOf(thread.counterpart.fullName)}.
                  </li>
                )}
                {thread.messages.map((message) => {
                  const own = message.senderId === session.sub;
                  return (
                    <li key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-card px-4 py-2.5 text-sm leading-relaxed ${
                          own ? "rounded-br-sm bg-primary text-primary-ink" : "rounded-bl-sm bg-surface-2 text-ink"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p className={`mt-1 text-[11px] ${own ? "text-primary-ink/75" : "text-ink-muted"}`}>
                          <time dateTime={message.createdAt.toISOString()}>{formatDateTime(message.createdAt)}</time>
                          {own ? (message.isRead ? " · Read" : " · Sent") : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="border-t border-hairline p-5">
                <ComposeMessage recipientId={thread.counterpart.id} recipientName={firstNameOf(thread.counterpart.fullName)} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-ink-muted">
              Choose a conversation or a complaint on the left, or start a new message.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
