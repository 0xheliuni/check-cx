"use client";

import { useEffect, useRef } from "react";

export function useConfigLiveReload(onConfigsChanged: () => void): void {
  const onConfigsChangedRef = useRef(onConfigsChanged);

  useEffect(() => {
    onConfigsChangedRef.current = onConfigsChanged;
  }, [onConfigsChanged]);

  useEffect(() => {
    const source = new EventSource("/api/live");

    source.onmessage = (event) => {
      if (!event.data) {
        return;
      }
      try {
        const payload = JSON.parse(event.data) as { type?: string };
        if (payload.type === "configs-changed") {
          onConfigsChangedRef.current();
        }
      } catch {
        // 忽略心跳或非 JSON
      }
    };

    return () => {
      source.close();
    };
  }, []);
}
