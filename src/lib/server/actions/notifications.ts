"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { notificationRecipients } from "@/db/schema";
import { getSession } from "@/lib/server/session";

/**
 * Records a read cursor for every visible notice, and clears direct-recipient
 * flags. Read-state is not audited (see docs/decisions/0002).
 */
export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await db.execute(sql`
    insert into notification_read_cursors (user_id, notification_id)
    select ${session.sub}::uuid, n.id
    from notifications n
    where (n.expires_at is null or n.expires_at > now())
      and (
        exists (
          select 1 from notification_recipients nr
          where nr.notification_id = n.id and nr.user_id = ${session.sub}::uuid
        )
        or (
          n.audience = 'ALL'
          and (
            n.audience_filter is null
            or (
              (n.audience_filter->>'region' is null or n.audience_filter->>'region' = ${session.region})
              and (n.audience_filter->>'directorate' is null or n.audience_filter->>'directorate' = ${session.directorate})
              and (n.audience_filter->>'cadre' is null or n.audience_filter->>'cadre' = ${session.cadre})
            )
          )
        )
      )
    on conflict (user_id, notification_id) do nothing
  `);

  await db
    .update(notificationRecipients)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notificationRecipients.userId, session.sub), eq(notificationRecipients.isRead, false)));

  revalidatePath("/", "layout");
  revalidatePath("/notifications");
}

/**
 * Mark one notice read, when it is actually opened.
 *
 * The drawer needs this: "mark all read" is a deliberate sweep, but a notice you
 * clicked has been read whether or not you press anything.
 */
export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await db.execute(sql`
    insert into notification_read_cursors (user_id, notification_id)
    select ${session.sub}::uuid, n.id
    from notifications n
    where n.id = ${notificationId}::uuid
    on conflict (user_id, notification_id) do nothing
  `);

  await db
    .update(notificationRecipients)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notificationRecipients.userId, session.sub),
        eq(notificationRecipients.notificationId, notificationId),
        eq(notificationRecipients.isRead, false),
      ),
    );

  revalidatePath("/", "layout");
}
