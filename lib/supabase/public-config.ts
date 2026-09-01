import "server-only";

import type { SupabasePublicConfig } from "./config-types";

export type { SupabasePublicConfig };

/**
 * 浏览器 Realtime 所需的公开配置。
 * 只返回 URL 与 publishable/anon key，绝不包含 service role。
 */
export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_OR_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
    schema: process.env.NODE_ENV === "development" ? "dev" : "public",
  };
}
