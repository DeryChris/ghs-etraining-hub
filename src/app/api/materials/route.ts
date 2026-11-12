import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { logAuditEvent } from "@/lib/server/audit-logger";
import { requireRole } from "@/lib/server/rbac-guards";

export async function GET() {
  const materials = await prisma.material.findMany({
    include: { space: true, author: true, comments: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(materials);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, summary, fileUrl, mimeType, formatType, version, isPublished, spaceId, authorId, userRole } = body;

  const guard = requireRole(userRole as any, "FACILITATOR");
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 403 });
  }

  const material = await prisma.material.create({
    data: {
      title,
      summary,
      fileUrl,
      mimeType,
      formatType,
      version,
      isPublished,
      spaceId,
      authorId,
    },
  });

  await logAuditEvent({
    userId: authorId,
    action: "MATERIAL_UPLOADED",
    entity: "Material",
    entityId: material.id,
    metadata: { title, spaceId, formatType },
  });

  return NextResponse.json(material, { status: 201 });
}
