import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { logAuditEvent } from "@/lib/server/audit-logger";
import { requireRole } from "@/lib/server/rbac-guards";

export async function GET() {
  const categories = await prisma.category.findMany({
    include: { spaces: true, facilitators: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { code, name, description, userId, userRole } = body;

  const guard = requireRole(userRole as any, "SYSTEM_ADMIN");
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 403 });
  }

  const category = await prisma.category.create({
    data: { code, name, description },
  });

  await logAuditEvent({
    userId,
    action: "CATEGORY_CREATED",
    entity: "Category",
    entityId: category.id,
    metadata: { code, name },
  });

  return NextResponse.json(category, { status: 201 });
}
