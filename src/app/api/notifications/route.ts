import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET() {
  const notifications = await prisma.notification.findMany({
    include: { recipients: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(notifications);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { title, body, type, priority, linkUrl, recipientIds } = body;

  const notification = await prisma.notification.create({
    data: {
      title,
      body,
      type,
      priority,
      linkUrl,
      recipients: {
        create: recipientIds.map((userId: string) => ({ userId })),
      },
    },
    include: { recipients: true },
  });

  return NextResponse.json(notification, { status: 201 });
}
