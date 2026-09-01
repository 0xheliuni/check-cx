import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const POLL_MS = 1000;
const encoder = new TextEncoder();

type LiveListener = (payload: string) => void;

declare global {
  var __CHECK_CX_LIVE_LISTENERS__: Set<LiveListener> | undefined;
  var __CHECK_CX_LIVE_TIMER__: NodeJS.Timeout | undefined;
  var __CHECK_CX_LIVE_STAMP__: string | null | undefined;
  var __CHECK_CX_LIVE_MISSING_TABLE__: boolean | undefined;
}

function getListeners(): Set<LiveListener> {
  if (!globalThis.__CHECK_CX_LIVE_LISTENERS__) {
    globalThis.__CHECK_CX_LIVE_LISTENERS__ = new Set();
  }
  return globalThis.__CHECK_CX_LIVE_LISTENERS__;
}

function encodeSse(payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function encodeComment(text: string): Uint8Array {
  return encoder.encode(`: ${text}\n\n`);
}

async function readRevisionStamp(): Promise<string | null> {
  if (globalThis.__CHECK_CX_LIVE_MISSING_TABLE__) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("check_data_revision")
    .select("bumped_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    const message = error.message ?? "";
    if (message.includes("check_data_revision") || error.code === "PGRST205" || error.code === "42P01") {
      globalThis.__CHECK_CX_LIVE_MISSING_TABLE__ = true;
      console.warn(
        "[check-cx] 未安装 check_data_revision，Admin 禁用/维护不会即时推送到面板。请执行 20260901140000_add_check_data_revision.sql"
      );
    } else {
      console.error("[check-cx] 读取配置版本失败", error);
    }
    return null;
  }

  const bumpedAt = data?.bumped_at;
  return typeof bumpedAt === "string" ? bumpedAt : bumpedAt ? new Date(bumpedAt).toISOString() : null;
}

async function pollRevision(): Promise<void> {
  const stamp = await readRevisionStamp();
  if (!stamp) {
    return;
  }

  const previous = globalThis.__CHECK_CX_LIVE_STAMP__;
  if (previous === undefined) {
    globalThis.__CHECK_CX_LIVE_STAMP__ = stamp;
    return;
  }
  if (previous === stamp) {
    return;
  }

  globalThis.__CHECK_CX_LIVE_STAMP__ = stamp;
  const payload = JSON.stringify({ type: "configs-changed" });
  for (const listener of getListeners()) {
    listener(payload);
  }
}

function ensureWatcher(): void {
  if (globalThis.__CHECK_CX_LIVE_TIMER__) {
    return;
  }
  globalThis.__CHECK_CX_LIVE_TIMER__ = setInterval(() => {
    pollRevision().catch((error) => {
      console.error("[check-cx] 配置版本轮询失败", error);
    });
  }, POLL_MS);
  pollRevision().catch(() => undefined);
}

function stopWatcherIfIdle(): void {
  if (getListeners().size > 0) {
    return;
  }
  if (globalThis.__CHECK_CX_LIVE_TIMER__) {
    clearInterval(globalThis.__CHECK_CX_LIVE_TIMER__);
    globalThis.__CHECK_CX_LIVE_TIMER__ = undefined;
  }
}

export function createConfigChangeStream(): ReadableStream<Uint8Array> {
  let listener: LiveListener | undefined;
  let heartbeat: NodeJS.Timeout | undefined;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      listener = (payload) => {
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // 客户端已断开
        }
      };
      getListeners().add(listener);
      ensureWatcher();
      controller.enqueue(encodeSse({ type: "hello" }));
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encodeComment("ping"));
        } catch {
          // 客户端已断开
        }
      }, 15000);
    },
    cancel() {
      if (heartbeat) {
        clearInterval(heartbeat);
      }
      if (listener) {
        getListeners().delete(listener);
      }
      stopWatcherIfIdle();
    },
  });
}
