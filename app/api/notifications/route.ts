import { NextResponse } from "next/server";

import { getActiveSystemNotifications } from "@/lib/database/notifications";


export async function GET() {
  const notifications = await getActiveSystemNotifications();

  return NextResponse.json(notifications, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
