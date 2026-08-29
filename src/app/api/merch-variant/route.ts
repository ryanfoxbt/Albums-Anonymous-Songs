import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { pickMerchVariant } from "@/lib/merchVariant";
import { getMerchAbTest } from "@/lib/siteSettings";

// Resolves the merch-link A/B variant client-side. The aa_vid cookie is
// httpOnly (see src/proxy.ts), so the browser can't read it directly — the
// header fetches this instead of computing the variant during render, which
// keeps pages that use the header (most of the site) statically generatable.
export async function GET() {
  const cookieStore = await cookies();
  const abTest = await getMerchAbTest();
  const variant = abTest.enabled
    ? pickMerchVariant(cookieStore.get("aa_vid")?.value)
    : "a";
  const text = variant === "b" ? abTest.variantBText : abTest.variantAText;

  return NextResponse.json({ variant, text });
}
