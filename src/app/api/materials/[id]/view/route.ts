import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { materialViews, materials } from "@/db/schema";
import { dateKeyInTimeZone } from "@/lib/dates";
import { isUuid } from "@/lib/ids";
import { log } from "@/lib/server/logger";
import { consumeRateLimit, rateLimitKey } from "@/lib/server/rate-limit";
import { getSession } from "@/lib/server/session";

/**
 * Records that a signed-in person opened a published material — once per person
 * per day, which is what makes the traffic number meaningful rather than a
 * measure of how often someone pressed refresh.
 *
 * Called by a fire-and-forget beacon from the viewer, so it also cannot be
 * triggered by a link preview or a prefetch: only a page that actually rendered
 * on someone's screen reports a view. It answers 204 either way; a counter must
 * never be the reason a page looks broken.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse(null, { status: 204 });

  try {
    const session = await getSession();
    if (!session) return new NextResponse(null, { status: 204 });

    const limit = await consumeRateLimit(rateLimitKey("material_view", session.sub), 240, 5 * 60);
    if (!limit.allowed) return new NextResponse(null, { status: 204 });

    const [material] = await db
      .select({ id: materials.id })
      .from(materials)
      .where(and(eq(materials.id, id), eq(materials.isPublished, true), eq(materials.state, "PUBLISHED")))
      .limit(1);
    if (!material) return new NextResponse(null, { status: 204 });

    const viewedOn = dateKeyInTimeZone();
    await db
      .insert(materialViews)
      .values({ materialId: id, userId: session.sub, viewedOn })
      .onConflictDoUpdate({
        target: [materialViews.materialId, materialViews.userId, materialViews.viewedOn],
        set: { viewCount: 1, lastViewedAt: new Date() },
      });
  } catch (error) {
    log.error({ event: "material_view.record_failed", err: String(error) });
  }

  return new NextResponse(null, { status: 204 });
}
