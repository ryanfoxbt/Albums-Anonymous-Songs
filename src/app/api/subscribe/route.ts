import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { prisma } from "@/lib/prisma";
import {
  renderWelcomeEmailHtml,
  renderWelcomeEmailText,
  WELCOME_EMAIL_SUBJECT,
} from "@/lib/emails/welcomeEmail";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM_ADDRESS = "Albums Anonymous <hello@albumsanonymous.com>";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  // Honeypot: bots tend to fill every field, real users never see this one.
  if (typeof body?.company === "string" && body.company.length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const { error } = await resend.contacts.create({
    email,
    unsubscribed: false,
  });

  if (error) {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 502 },
    );
  }

  // Best-effort welcome email — the subscription itself already succeeded
  // above (they're on the Resend audience), so a delivery hiccup here
  // shouldn't turn into an error for the visitor.
  const { error: emailError } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: WELCOME_EMAIL_SUBJECT,
    html: renderWelcomeEmailHtml(),
    text: renderWelcomeEmailText(),
  });
  if (emailError) {
    console.warn("[subscribe] welcome email failed to send:", emailError);
  }

  // Best-effort local join key so admin analytics can tie this email to
  // its visit history. Resend stays the source of truth for the mailing
  // list itself — this never blocks the response above.
  const visitorId = (await cookies()).get("aa_vid")?.value ?? null;
  await prisma.subscriber
    .upsert({
      where: { email },
      create: { email, visitorId },
      // Never overwrite an existing link — keep first-touch attribution
      // (and avoid the visitorId unique constraint if it's already tied
      // to a different email).
      update: {},
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
