import Link from "next/link";
import { ComposeMessage, type Recipient } from "@/components/messages/compose-message";
import { MarkThreadRead } from "@/components/messages/mark-thread-read";
import { DataUnavailable } from "@/components/ui/data-unavailable";
import { ListEmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { ROLE_LABELS } from "@/lib/labels";
import { firstNameOf } from "@/lib/names";
import { getThread, listConversations, listDirectory } from "@/lib/server/messaging-queries";
import { requireSession } from "@/lib/server/rbac";
import { mapLimit, withDeadline } from "@/lib/server/page-data";

function parseBefore(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string; before?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const withParam = params.with;
  const before = parseBefore(params.before);

  const loaded = await withDeadline("messages", () =>
    mapLimit([() => listConversations(session.sub), () => listDirectory(session.sub)]),
  );
  if (!loaded.ok) {
    return (
      <DataUnavailable
        title="Messages did not load"
        description="Conversations and the staff directory could not be read in time. Nothing was changed."
        requestId={loaded.requestId}
      />
    );
  }
  const [conversations, directory] = loaded.data;
  const activeId = isUuid(withParam) ? withParam : null;
  const thread = activeId ? await getThread(session.sub, activeId, { before }) : null;

  const recipients: Recipient[] = directory.map((person) => ({
    id: person.id,
    name: person.fullName,
    role: person.role,
    facility: person.facility,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Secure staff messaging"
        title="Messages"
        description="Message colleagues across GHS facilities. Keep messages to work matters. Never include patient information."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="conversations-heading" className="space-y-6 lg:col-span-1">
          <div className="rounded-card border border-hairline bg-surface p-5 shadow-panel">
            <h2 id="conversations-heading" className="mb-4 text-sm font-semibold text-ink">
              New message
            </h2>
            <ComposeMessage recipients={recipients} />
          </div>

          {conversations.length === 0 ? (
            <ListEmptyState title="No conversations yet" description="Choose a colleague above to start one." />
          ) : (
            <ul className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
              {conversations.map((conversation) => {
                const isActive = conversation.counterpartId === activeId;
                return (
                  <li key={conversation.counterpartId}>
                    <Link
                      href={`/messages?with=${conversation.counterpartId}`}
                      aria-current={isActive ? "true" : undefined}
                      className={`flex items-start gap-3 p-4 transition-colors ${isActive ? "bg-primary/10" : "hover:bg-surface-2"}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{conversation.counterpartName}</p>
                        <p className="truncate text-xs text-ink-muted">{conversation.lastBody}</p>
                        <p className="mt-1 text-[11px] text-ink-muted">{formatDateTime(conversation.lastAt)}</p>
                      </div>
                      {conversation.unread > 0 && (
                        <span className="mt-1 min-w-5 rounded-full bg-primary px-1.5 text-center text-[10px] font-bold leading-5 text-primary-ink">
                          <span className="sr-only">Unread: </span>
                          {conversation.unread}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          aria-label="Conversation"
          className="flex min-h-[32rem] flex-col rounded-card border border-hairline bg-surface shadow-panel lg:col-span-2"
        >
          {thread ? (
            <>
              <MarkThreadRead counterpartId={thread.counterpart.id} />
              <header className="border-b border-hairline p-5">
                <p className="font-semibold text-ink">{thread.counterpart.fullName}</p>
                <p className="text-xs text-ink-muted">
                  {ROLE_LABELS[thread.counterpart.role]}
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
              Choose a conversation on the left, or start a new message.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
