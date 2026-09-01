import {NextResponse} from "next/server";
import {loadGroupDashboardData} from "@/lib/core/group-data";
import {getPollingIntervalMs} from "@/lib/core/polling-config";
import type {AvailabilityPeriod} from "@/lib/types";

interface RouteContext {
  params: Promise<{ groupName: string }>;
}


/** 数据变化周期：5 分钟 */
const DATA_CHANGE_CYCLE_SECONDS = 5 * 60;

/**
 * 生成简单的哈希作为 ETag
 * 使用 djb2 算法，足够快且碰撞率低
 */
function generateETag(data: string): string {
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) ^ data.charCodeAt(i);
  }
  // 转为无符号 32 位整数的十六进制
  return `"${(hash >>> 0).toString(16)}"`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { groupName } = await context.params;
  const decodedGroupName = decodeURIComponent(groupName);

  const { searchParams } = new URL(_request.url);
  const period = searchParams.get("trendPeriod");
  const forceRefreshParam = searchParams.get("forceRefresh");
  const shouldForceRefresh =
    forceRefreshParam === "1" || forceRefreshParam === "true";
  const shouldRevalidate =
    searchParams.get("revalidate") === "1" ||
    searchParams.get("revalidate") === "true";
  const trendPeriod = (["7d", "15d", "30d"] as AvailabilityPeriod[]).includes(
    period as AvailabilityPeriod
  )
    ? (period as AvailabilityPeriod)
    : undefined;

  const data = await loadGroupDashboardData(decodedGroupName, {
    refreshMode: shouldForceRefresh ? "always" : "never",
    trendPeriod,
    bypassReadCaches: shouldRevalidate && !shouldForceRefresh,
  });

  if (!data) {
    return NextResponse.json(
      { error: "分组不存在或没有配置" },
      { status: 404 }
    );
  }

  // 生成 ETag（基于数据内容）
  const { generatedAt, ...etagPayload } = data;
  void generatedAt;
  const jsonBody = JSON.stringify(etagPayload);
  const etag = generateETag(jsonBody);

  // 检查条件请求
  const ifNoneMatch = _request.headers.get("If-None-Match");
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
      },
    });
  }

  // 计算缓存时间
  const pollIntervalSeconds = Math.floor(getPollingIntervalMs() / 1000);

  const response = NextResponse.json(data);

  response.headers.set("Cache-Control", "public, no-cache");
  if (shouldRevalidate || shouldForceRefresh) {
    response.headers.set("CDN-Cache-Control", "no-store");
    response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
  } else {
    response.headers.set("CDN-Cache-Control", `max-age=${pollIntervalSeconds}`);
    response.headers.set(
      "Cloudflare-CDN-Cache-Control",
      `max-age=${pollIntervalSeconds}, stale-while-revalidate=${DATA_CHANGE_CYCLE_SECONDS}`
    );
  }
  response.headers.set("ETag", etag);
  response.headers.set("Vary", "Accept-Encoding");

  return response;
}
