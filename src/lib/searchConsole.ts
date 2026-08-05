import { JWT } from "google-auth-library";
import type { DateRange } from "@/lib/dateRange";

const SITE_URL = "https://albumsanonymous.com/";
const API_BASE = "https://www.googleapis.com/webmasters/v3/sites";

let authClient: JWT | null = null;

function getAuthClient(): JWT | null {
  const email = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;
  if (!email || !key) return null;

  if (!authClient) {
    authClient = new JWT({
      email,
      key: key.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
  }
  return authClient;
}

export function isSearchConsoleConfigured(): boolean {
  return getAuthClient() !== null;
}

function toApiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type SearchAnalyticsRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

async function queryAnalytics(body: Record<string, unknown>): Promise<SearchAnalyticsRow[]> {
  const client = getAuthClient();
  if (!client) return [];

  const response = await client.request<{ rows?: SearchAnalyticsRow[] }>({
    url: `${API_BASE}/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`,
    method: "POST",
    data: body,
  });

  return response.data.rows ?? [];
}

export type SearchOverview = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * Aggregate totals across every query in range. Search Console data lags
 * by roughly 2-3 days, so very recent dates may simply come back empty.
 */
export async function getSearchOverview(range: DateRange): Promise<SearchOverview | null> {
  if (!isSearchConsoleConfigured()) return null;

  const rows = await queryAnalytics({
    startDate: toApiDate(range.from),
    endDate: toApiDate(range.to),
    rowLimit: 1,
  }).catch(() => null);

  if (!rows) return null;
  const row = rows[0];
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: row?.ctr ?? 0,
    position: row?.position ?? 0,
  };
}

export type TopSearchQuery = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export async function getTopSearchQueries(
  range: DateRange,
  limit = 25,
): Promise<TopSearchQuery[] | null> {
  if (!isSearchConsoleConfigured()) return null;

  const rows = await queryAnalytics({
    startDate: toApiDate(range.from),
    endDate: toApiDate(range.to),
    dimensions: ["query"],
    rowLimit: limit,
  }).catch(() => null);

  if (!rows) return null;

  return rows.map((row) => ({
    query: row.keys?.[0] ?? "",
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

export type TopSearchPage = {
  path: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export async function getTopSearchPages(
  range: DateRange,
  limit = 25,
): Promise<TopSearchPage[] | null> {
  if (!isSearchConsoleConfigured()) return null;

  const rows = await queryAnalytics({
    startDate: toApiDate(range.from),
    endDate: toApiDate(range.to),
    dimensions: ["page"],
    rowLimit: limit,
  }).catch(() => null);

  if (!rows) return null;

  return rows.map((row) => ({
    path: (row.keys?.[0] ?? "").replace(SITE_URL.replace(/\/$/, ""), "") || "/",
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}
