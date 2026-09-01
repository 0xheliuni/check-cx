import { connection } from "next/server";

import { createConfigChangeStream } from "@/lib/core/config-change-watch";

export const runtime = "nodejs";

export async function GET() {
  await connection();

  return new Response(createConfigChangeStream(), {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
