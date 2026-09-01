"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import type { BrowserSupabaseClient } from "@/lib/supabase/browser";
import { useBrowserSupabase } from "@/lib/supabase/browser-context";
import type { SupabasePublicConfig } from "@/lib/supabase/config-types";

export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "SUBSCRIBED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED";

const DASHBOARD_DEBOUNCE_MS = 500;
const NOTIFICATION_DEBOUNCE_MS = 150;

type ListenerKind = "dashboard" | "notifications";

const dashboardListeners = new Set<() => void>();
const notificationListeners = new Set<() => void>();
const statusListeners = new Set<(status: RealtimeConnectionStatus) => void>();

let activeClient: BrowserSupabaseClient | null = null;
let activeSchema: SupabasePublicConfig["schema"] | null = null;
let activeChannel: RealtimeChannel | null = null;
let connectionStatus: RealtimeConnectionStatus = "idle";
let dashboardDebounce: ReturnType<typeof setTimeout> | null = null;
let notificationDebounce: ReturnType<typeof setTimeout> | null = null;

function setConnectionStatus(next: RealtimeConnectionStatus): void {
  if (connectionStatus === next) {
    return;
  }
  connectionStatus = next;
  const listeners = [...statusListeners];
  queueMicrotask(() => {
    for (const listener of listeners) {
      if (statusListeners.has(listener)) {
        listener(next);
      }
    }
  });
}

function schedule(kind: ListenerKind): void {
  if (kind === "dashboard") {
    if (dashboardDebounce) {
      clearTimeout(dashboardDebounce);
    }
    dashboardDebounce = setTimeout(() => {
      dashboardDebounce = null;
      for (const listener of dashboardListeners) {
        listener();
      }
    }, DASHBOARD_DEBOUNCE_MS);
    return;
  }

  if (notificationDebounce) {
    clearTimeout(notificationDebounce);
  }
  notificationDebounce = setTimeout(() => {
    notificationDebounce = null;
    for (const listener of notificationListeners) {
      listener();
    }
  }, NOTIFICATION_DEBOUNCE_MS);
}

function ensureChannel(
  client: BrowserSupabaseClient,
  schema: SupabasePublicConfig["schema"]
): void {
  if (activeChannel && activeClient === client && activeSchema === schema) {
    return;
  }

  if (activeChannel && activeClient) {
    void activeClient.removeChannel(activeChannel);
    activeChannel = null;
  }

  activeClient = client;
  activeSchema = schema;
  setConnectionStatus("connecting");

  const channel = client
    .channel("dashboard-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema, table: "check_history" },
      () => schedule("dashboard")
    )
    .on(
      "postgres_changes",
      { event: "*", schema, table: "group_info" },
      () => schedule("dashboard")
    )
    .on(
      "postgres_changes",
      { event: "*", schema, table: "system_notifications" },
      () => {
        schedule("notifications");
        schedule("dashboard");
      }
    )
    .subscribe((status) => {
      if (
        status === "SUBSCRIBED" ||
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        setConnectionStatus(status);
      }
    });

  activeChannel = channel;
}

function teardownIfUnused(): void {
  if (dashboardListeners.size > 0 || notificationListeners.size > 0) {
    return;
  }

  if (dashboardDebounce) {
    clearTimeout(dashboardDebounce);
    dashboardDebounce = null;
  }
  if (notificationDebounce) {
    clearTimeout(notificationDebounce);
    notificationDebounce = null;
  }

  if (activeChannel && activeClient) {
    void activeClient.removeChannel(activeChannel);
  }
  activeChannel = null;
  activeClient = null;
  activeSchema = null;
  setConnectionStatus("idle");
}

function subscribeKind(
  client: BrowserSupabaseClient,
  schema: SupabasePublicConfig["schema"],
  kind: ListenerKind,
  listener: () => void,
  onStatus: (status: RealtimeConnectionStatus) => void
): () => void {
  const bucket = kind === "dashboard" ? dashboardListeners : notificationListeners;
  bucket.add(listener);
  statusListeners.add(onStatus);
  ensureChannel(client, schema);

  return () => {
    bucket.delete(listener);
    statusListeners.delete(onStatus);
    teardownIfUnused();
  };
}

function useRealtimeRefresh(
  kind: ListenerKind,
  onRefresh: () => void
): RealtimeConnectionStatus {
  const supabase = useBrowserSupabase();
  const [status, setStatus] = useState<RealtimeConnectionStatus>(() =>
    supabase ? connectionStatus : "idle"
  );
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const listener = () => {
      onRefreshRef.current();
    };

    return subscribeKind(
      supabase.client,
      supabase.schema,
      kind,
      listener,
      setStatus
    );
  }, [kind, supabase]);

  return supabase ? status : "idle";
}

export function useRealtimeDashboardRefresh(
  onRefresh: () => void
): RealtimeConnectionStatus {
  return useRealtimeRefresh("dashboard", onRefresh);
}

export function useRealtimeNotificationsRefresh(
  onRefresh: () => void
): RealtimeConnectionStatus {
  return useRealtimeRefresh("notifications", onRefresh);
}

export function isRealtimeConnected(
  status: RealtimeConnectionStatus
): boolean {
  return status === "SUBSCRIBED";
}
