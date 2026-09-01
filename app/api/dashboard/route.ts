import {NextResponse} from "next/server";

import {loadDashboardDataWithEtag} from "@/lib/core/dashboard-data";
import type {AvailabilityPeriod} from "@/lib/types";


const VALID_PERIODS: AvailabilityPeriod[] = ["7d", "15d", "30d"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("trendPeriod");
  const forceRefreshParam = searchParams.get("forceRefresh");
  const shouldForceRefresh =
    forceRefreshParam === "1" || forceRefreshParam === "true";
  const trendPeriod = VALID_PERIODS.includes(period as AvailabilityPeriod)
    ? (period as AvailabilityPeriod)
    : undefined;

  const { data, etag } = await loadDashboardDataWithEtag({
    refreshMode: shouldForceRefresh ? "always" : "never",
    trendPeriod,
    bypassReadCaches: true,
  });

  // 检查条件请求
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch === etag) {
    // 数据未变，返回 304
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
      },
    });
  }

  const response = NextResponse.json(data);

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");

  // ETag
  response.headers.set("ETag", etag);

  // Vary: 确保不同参数的请求分开缓存
  response.headers.set("Vary", "Accept-Encoding");

  return response;
}
