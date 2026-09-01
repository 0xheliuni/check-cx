"use client";

import { createClient } from "@supabase/supabase-js";

import type { SupabasePublicConfig } from "./config-types";

export type { SupabasePublicConfig };

function createBrowserClient(config: SupabasePublicConfig) {
  return createClient(config.url, config.anonKey, {
    db: { schema: config.schema },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });
}

export type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

let cached: { key: string; client: BrowserSupabaseClient } | null = null;

export function getBrowserSupabaseClient(
  config: SupabasePublicConfig
): BrowserSupabaseClient {
  const key = `${config.url}::${config.schema}`;
  if (cached?.key === key) {
    return cached.client;
  }

  const client = createBrowserClient(config);
  cached = { key, client };
  return client;
}
