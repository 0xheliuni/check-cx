/**
 * 智能评估统计查询模块
 */

import "server-only";

import {createAdminClient} from "../supabase/admin";
import {getPollingIntervalMs} from "../core/polling-config";
import type {IntelligenceStats} from "../types/database";
import type {IntelligenceStatsMap} from "../types";
import {logError} from "../utils";

interface IntelligenceCache {
  data: IntelligenceStatsMap;
  lastFetchedAt: number;
}

const cache: IntelligenceCache = {
  data: {},
  lastFetchedAt: 0,
};

function normalizeIds(ids?: Iterable<string> | null): string[] | null {
  if (!ids) {
    return null;
  }
  const normalized = Array.from(ids).filter(Boolean);
  return normalized.length > 0 ? normalized : [];
}

function filterStats(
  data: IntelligenceStatsMap,
  ids: string[] | null
): IntelligenceStatsMap {
  if (!ids) {
    return data;
  }
  if (ids.length === 0) {
    return {};
  }
  const result: IntelligenceStatsMap = {};
  for (const id of ids) {
    if (data[id]) {
      result[id] = data[id];
    }
  }
  return result;
}

function mapRows(rows: IntelligenceStats[] | null): IntelligenceStatsMap {
  if (!rows || rows.length === 0) {
    return {};
  }

  const mapped: IntelligenceStatsMap = {};
  for (const row of rows) {
    mapped[row.config_id] = {
      totalSamples: Number(row.total_samples ?? 0),
      d1PassRate: row.d1_pass_rate === null ? null : Number(row.d1_pass_rate),
      d2PassRate: row.d2_pass_rate === null ? null : Number(row.d2_pass_rate),
      d3PassRate: row.d3_pass_rate === null ? null : Number(row.d3_pass_rate),
      d4PassRate: row.d4_pass_rate === null ? null : Number(row.d4_pass_rate),
      d5PassRate: row.d5_pass_rate === null ? null : Number(row.d5_pass_rate),
      totalScore: row.total_score === null ? null : Number(row.total_score),
    };
  }

  return mapped;
}

export async function getIntelligenceStats(
  configIds?: Iterable<string> | null,
  options?: { forceRefresh?: boolean }
): Promise<IntelligenceStatsMap> {
  const normalizedIds = normalizeIds(configIds);
  if (Array.isArray(normalizedIds) && normalizedIds.length === 0) {
    return {};
  }

  const ttl = getPollingIntervalMs();
  const now = Date.now();
  // 缓存可能由子集查询填充，命中前需确认覆盖本次请求的所有 id
  const cacheCovers =
    !normalizedIds || normalizedIds.every((id) => id in cache.data);
  if (
    !options?.forceRefresh &&
    cacheCovers &&
    now - cache.lastFetchedAt < ttl &&
    Object.keys(cache.data).length > 0
  ) {
    return filterStats(cache.data, normalizedIds);
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("intelligence_stats")
    .select(
      "config_id, total_samples, d1_pass_rate, d2_pass_rate, d3_pass_rate, d4_pass_rate, d5_pass_rate, total_score"
    )
    .order("config_id", { ascending: true });

  // 有明确 id 列表时过滤下推到数据库，减少传输与 JS filter
  if (normalizedIds) {
    query = query.in("config_id", normalizedIds);
  }

  const { data, error } = await query;

  if (error) {
    logError("读取智能评估统计失败", error);
    return {};
  }

  const mapped = mapRows(data as IntelligenceStats[] | null);
  // 合并而非替换：子集查询不能清掉其他 config 的缓存
  Object.assign(cache.data, mapped);
  cache.lastFetchedAt = now;

  return filterStats(mapped, normalizedIds);
}
