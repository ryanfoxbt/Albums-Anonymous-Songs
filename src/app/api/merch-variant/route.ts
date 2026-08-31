import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { pickMerchVariant } from "@/lib/merchVariant";
import { getVisitorEngagement } from "@/lib/merchEngagement";
import { getMerchAbTest } from "@/lib/siteSettings";

// Resolves the merch link's A/B variant and whether it should show at all,
// client-side. The aa_vid cookie is httpOnly (see src/proxy.ts), so the
// browser can't compute either of these itself — the header fetches this
// instead of doing it during render, which keeps pages that use the header
// (most of the site) statically generatable.
export async function GET() {
  const cookieStore = await cookies();
  const visitorId = cookieStore.get("aa_vid")?.value;
  const abTest = await getMerchAbTest();

  const variant = abTest.enabled ? pickMerchVariant(visitorId) : "a";
  const text = variant === "b" ? abTest.variantBText : abTest.variantAText;

  const visible = abTest.linkGateEnabled
    ? (await getVisitorEngagement(visitorId)).engaged
    : true;

  return NextResponse.json({ variant, text, visible });
}
