import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";

// The public inbox never appears in any client HTML/JS — it only lives
// here, server-side. This endpoint forwards the form to it with several
// cheap bot filters (honeypot, fill-time, link-spam, a crude per-instance
// burst cap). Durable rate limiting / bot detection should be layered on
// at the platform (Vercel WAF rate-limit rule on /api/contact, or
// @vercel/botid) — see the note in the contact page.

const TO_ADDRESS = "contact@permrecords.com";
const FROM_ADDRESS = "Albums Anonymous <hello@albumsanonymous.com>";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_FILL_MS = 2500;
const MAX_MESSAGE = 5000;

// Best-effort burst cap. Per-instance and resets on cold start, so it is
// only a speed bump — real limiting belongs at the edge.
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
    // Nothing parseable — pretend it worked so scanners learn nothing.
    return NextResponse.json({ ok: true });
  }

  // Honeypot: a hidden field real users never fill.
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

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name =
    typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const message =
    typeof body.message === "string"
      ? body.message.trim().slice(0, MAX_MESSAGE)
      : "";

  if (!EMAIL_PATTERN.test(email) || message.length < 10) {
    return NextResponse.json(
      { error: "Add your email and a short message (10+ characters)." },
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
    replyTo: email,
    subject: `Contact form — ${name || email}`,
    text: `From: ${name || "(no name given)"} <${email}>\nIP: ${ip}\n\n${message}`,
  });

  if (error) {
    return NextResponse.json(
      { error: "Something went wrong sending that. Try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
