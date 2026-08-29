import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const visitorId = cookieStore.get("aa_vid")?.value;
  const sessionId = cookieStore.get("aa_sid")?.value;
  if (!visitorId || !sessionId) {
    return new NextResponse(null, { status: 204 });
  }

  const body = await request.json().catch(() => null);
  const variant =
    typeof body?.variant === "string" ? body.variant.slice(0, 20) : null;
  const text = typeof body?.text === "string" ? body.text.slice(0, 500) : "";
  const path = typeof body?.path === "string" ? body.path.slice(0, 500) : "";
  if (!variant) {
    return NextResponse.json({ error: "variant is required" }, { status: 400 });
  }

  await prisma.merchLinkClick
    .create({ data: { visitorId, sessionId, path, variant, text } })
    .catch(() => {
      // e.g. the session row hasn't landed yet in a race with the pageview call
    });

  return new NextResponse(null, { status: 204 });
}
