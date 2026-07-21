"use client";

import {useEffect, useState} from "react";
import {cn} from "@/lib/utils";

/** 每个 tab 会话只播放一次开机动画 */
const BOOT_SEEN_KEY = "check-cx-nier-boot-seen";
const BOOT_DURATION_MS = 1800;
const FADE_DURATION_MS = 500;

const BOOT_LINES = [
  "LOADING - BOOTING SYSTEM…",
  "MEMORY UNIT: GREEN",
  "INITIALIZING NETWORK PROTOCOLS… OK",
  "LOADING PROVIDER STATUS DATA… OK",
  "ALL SYSTEMS GREEN",
];

export function NierBoot() {
  const [phase, setPhase] = useState<"boot" | "fade" | "done">("boot");

  useEffect(() => {
    let fadeTimer: number | undefined;
    let doneTimer: number | undefined;

    const frame = window.requestAnimationFrame(() => {
      if (window.sessionStorage.getItem(BOOT_SEEN_KEY)) {
        setPhase("done");
        return;
      }

      fadeTimer = window.setTimeout(() => setPhase("fade"), BOOT_DURATION_MS);
      doneTimer = window.setTimeout(() => {
        setPhase("done");
        window.sessionStorage.setItem(BOOT_SEEN_KEY, "1");
      }, BOOT_DURATION_MS + FADE_DURATION_MS);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") {
    return null;
  }

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-[9998] flex items-center justify-center bg-background transition-opacity duration-500",
        phase === "fade" && "opacity-0"
      )}
    >
      <div className="w-full max-w-md px-6 text-xs text-foreground sm:text-sm">
        <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.35em] sm:text-base">
          Check CX — System
        </p>
        <div className="nier-rule mb-4" />
        {BOOT_LINES.map((line, index) => (
          <p
            key={line}
            className="nier-boot-line uppercase leading-relaxed tracking-widest"
            style={{ animationDelay: `${index * 0.2}s` }}
          >
            {line}
          </p>
        ))}
        <p
          className="nier-boot-line mt-3"
          style={{ animationDelay: `${BOOT_LINES.length * 0.2}s` }}
        >
          <span className="nier-caret" />
        </p>
      </div>
    </div>
  );
}
