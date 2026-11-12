import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { logAuditEvent } from "@/lib/server/audit-logger";
import { requireRole } from "@/lib/server/rbac-guards";

export async function GET() {
  const spaces = await prisma.space.findMany({
    include: { category: true, materials: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(spaces);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { slug, title, description, cpdPointsValue, categoryId, createdById, userRole } = body;

  const guard = requireRole(userRole as any, "FACILITATOR");
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 403 });
  }

  const space = await prisma.space.create({
    data: { slug, title, description, cpdPointsValue, categoryId, createdById },
  });

  await logAuditEvent({
    userId: createdById,
    action: "SPACE_CREATED",
    entity: "Space",
    entityId: space.id,
    metadata: { slug, title, categoryId },
  });

  return NextResponse.json(space, { status: 201 });
}
