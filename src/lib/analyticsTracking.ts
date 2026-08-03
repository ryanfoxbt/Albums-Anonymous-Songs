import { prisma } from "@/lib/prisma";

const MAX_FIELD_LEN = 200;

export type UtmParams = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
};

function cleanParam(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, MAX_FIELD_LEN);
  return trimmed.length > 0 ? trimmed : null;
}

export function parseUtmParams(
  searchParams: URLSearchParams | Record<string, string | undefined>,
): UtmParams {
  const get = (key: string) =>
    searchParams instanceof URLSearchParams
      ? searchParams.get(key)
      : (searchParams[key] ?? null);

  return {
    utmSource: cleanParam(get("utm_source")),
    utmMedium: cleanParam(get("utm_medium")),
    utmCampaign: cleanParam(get("utm_campaign")),
    utmTerm: cleanParam(get("utm_term")),
    utmContent: cleanParam(get("utm_content")),
  };
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|ahrefsbot|semrushbot|mj12bot|petalbot|yandexbot|duckduckbot|baiduspider|pingdom|uptimerobot|headlesschrome/i;

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_PATTERN.test(userAgent);
}

export type ParsedUserAgent = {
  deviceType: "mobile" | "tablet" | "desktop";
  browser: string;
  os: string;
};

export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  const ua = userAgent ?? "";

  let deviceType: ParsedUserAgent["deviceType"] = "desktop";
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
    deviceType = "tablet";
  } else if (/Mobi|iPhone|iPod/i.test(ua)) {
    deviceType = "mobile";
  }

  let browser = "Other";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";

  let os = "Other";
  if (/Windows NT/.test(ua)) os = "Windows";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";

  return { deviceType, browser, os };
}

export function getGeoCountry(headers: Headers): string | null {
  return headers.get("x-vercel-ip-country");
}

/**
 * Upserts the Visitor row and, on the first request of a new session id,
 * creates the VisitSession (capturing this session's attribution and
 * whether the visitor has browsed before). Existing sessions just get
 * their activity timestamp bumped.
 */
export async function ensureVisitorAndSession(params: {
  visitorId: string;
  sessionId: string;
  pathname: string;
  utm: UtmParams;
  referrer: string | null;
  userAgent: string | null;
  country: string | null;
}): Promise<{ isNewSession: boolean }> {
  const { visitorId, sessionId, pathname, utm, referrer, userAgent, country } =
    params;

  const existingVisitor = await prisma.visitor.findUnique({
    where: { id: visitorId },
  });

  if (!existingVisitor) {
    await prisma.visitor.create({
      data: {
        id: visitorId,
        firstUtmSource: utm.utmSource,
        firstUtmMedium: utm.utmMedium,
        firstUtmCampaign: utm.utmCampaign,
        firstUtmTerm: utm.utmTerm,
        firstUtmContent: utm.utmContent,
        firstReferrer: referrer,
        firstLandingPath: pathname,
        country,
      },
    });
  } else {
    await prisma.visitor.update({
      where: { id: visitorId },
      data: { lastSeenAt: new Date() },
    });
  }

  const existingSession = await prisma.visitSession.findUnique({
    where: { id: sessionId },
  });

  if (existingSession) {
    await prisma.visitSession.update({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
    return { isNewSession: false };
  }

  const priorSessionCount = await prisma.visitSession.count({
    where: { visitorId },
  });
  const { deviceType, browser, os } = parseUserAgent(userAgent);

  await prisma.visitSession.create({
    data: {
      id: sessionId,
      visitorId,
      isReturning: priorSessionCount > 0,
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      utmTerm: utm.utmTerm,
      utmContent: utm.utmContent,
      referrer,
      landingPath: pathname,
      country,
      deviceType,
      browser,
      os,
    },
  });

  return { isNewSession: true };
}
