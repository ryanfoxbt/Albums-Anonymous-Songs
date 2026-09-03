import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";

// A no-login "complain about anything" box in the site nav. Message only —
// no email required. Same cheap bot filters as /api/contact (honeypot,
// fill-time, per-instance burst cap, link-spam); durable limiting belongs at
// the edge (Vercel WAF rate-limit rule on /api/complain).

const TO_ADDRESS = "contact@permrecords.com";
const FROM_ADDRESS = "Albums Anonymous <hello@albumsanonymous.com>";
const MIN_FILL_MS = 1500;
export const MAX_COMPLAINT = 1000;

const recentHits = new Map<string, number[]>();
function isBursting(ip: string): boolean {
  const now = Date.now();
  const hits = (recentHits.get(ip) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recentHits.set(ip, hits);
  return hits.length > 4;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: true });
  }

  // Honeypot — a hidden field only bots fill.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  // Submitted implausibly fast after the form mounted → automated.
  const elapsed = Number(body.elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(request);
  if (isBursting(ip)) {
    return NextResponse.json(
      { error: "Give it a minute and try again." },
      { status: 429 },
    );
  }

  const message =
    typeof body.message === "string"
      ? body.message.trim().slice(0, MAX_COMPLAINT)
      : "";

  if (message.length < 3) {
    return NextResponse.json(
      { error: "Add a few words about what's wrong." },
      { status: 400 },
    );
  }

  // Link-stuffed messages are almost always spam.
  if ((message.match(/https?:\/\//gi) ?? []).length > 3) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: TO_ADDRESS,
    subject: "Complaint via site",
    text: `IP: ${ip}\n\n${message}`,
  });

  if (error) {
    return NextResponse.json(
      { error: "Something went wrong sending that. Try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
