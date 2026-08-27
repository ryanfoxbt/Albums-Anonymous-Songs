import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_CHOICES = new Set(["spotify", "youtube", "apple", "listen"]);

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("aa_sid")?.value;
  if (!sessionId) {
    return new NextResponse(null, { status: 204 });
  }

  const body = await request.json().catch(() => null);
  const choice = typeof body?.choice === "string" ? body.choice : null;
  if (!choice || !VALID_CHOICES.has(choice)) {
    return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
  }

  // First touch only — a session's entry choice is the first Listen/Watch
  // button it clicked, not the last.
  await prisma.visitSession.updateMany({
    where: { id: sessionId, entryChoice: null },
    data: { entryChoice: choice },
  });

  return new NextResponse(null, { status: 204 });
}
