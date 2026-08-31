// One-line explanations of the (deliberately weird) song categories, for
// the /category/[slug] meta description and intro copy. Categories without
// an entry fall back to a generated line.

export const CATEGORY_SEO: Record<string, string> = {
  smells:
    "Funny songs about farts, body odor and bad smells — elevator crop-dusting, hotel gas warfare and one Simon & Garfunkel parody about breaking wind.",
  "dad-life":
    "Comedy songs about being a worn-down dad — wiping butts, Costco runs, dead bedrooms, snack tyranny and selling your music catalogue to pay for it all.",
  medical:
    "Funny songs about doctors and the body — colonoscopies, moles, food allergies and the healthy way to eat pizza (blot the grease with a napkin).",
  anxiety:
    "Comedy songs about everyday dread — bathroom anxiety, stress constipation and needing a public restroom you do not trust.",
  "bad-with-girls":
    "Funny songs about striking out romantically — emo breakups over eyeliner and skinny jeans, and other dating disasters.",
  "kinky-stuff": "Funny songs that get weird about the body and hygiene.",
  "not-kinky-stuff":
    "Funny songs that sound suspicious but really are not — like an ode to always wearing a jacket.",
  "odd-duck":
    "Comedy songs about oddballs and one-offs — a raccoon charity anthem, a Prius-loving country boy and other strange characters.",
};

export function getCategorySeo(slug: string): string | undefined {
  return CATEGORY_SEO[slug];
}
