"use client";

import { createContext, useContext, useMemo } from "react";

import { getBrowserSupabaseClient, type BrowserSupabaseClient } from "./browser";
import type { SupabasePublicConfig } from "./config-types";

interface BrowserSupabaseValue {
  client: BrowserSupabaseClient;
  schema: SupabasePublicConfig["schema"];
}

const SupabaseBrowserContext = createContext<BrowserSupabaseValue | null>(null);

interface SupabaseBrowserProviderProps {
  config: SupabasePublicConfig | null;
  children: React.ReactNode;
}

export function SupabaseBrowserProvider({
  config,
  children,
}: SupabaseBrowserProviderProps) {
  const url = config?.url;
  const anonKey = config?.anonKey;
  const schema = config?.schema;
  const value = useMemo<BrowserSupabaseValue | null>(() => {
    if (!url || !anonKey || !schema) {
      return null;
    }
    return {
      client: getBrowserSupabaseClient({ url, anonKey, schema }),
      schema,
    };
  }, [anonKey, schema, url]);

  return (
    <SupabaseBrowserContext.Provider value={value}>
      {children}
    </SupabaseBrowserContext.Provider>
  );
}

export function useBrowserSupabase(): BrowserSupabaseValue | null {
  return useContext(SupabaseBrowserContext);
}
