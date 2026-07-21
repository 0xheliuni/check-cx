"use client";

import {AlertTriangle, Radio, Zap} from "lucide-react";

import {ProviderIcon} from "@/components/provider-icon";
import {StatusTimeline} from "@/components/status-timeline";
import {AvailabilityStats} from "@/components/availability-stats";
import type {AvailabilityPeriod, AvailabilityStat, ProviderTimeline} from "@/lib/types";
import {OFFICIAL_STATUS_META, PROVIDER_LABEL, STATUS_META} from "@/lib/core/status";
import {cn} from "@/lib/utils";

interface ProviderCardProps {
  timeline: ProviderTimeline;
  timeToNextRefresh: number | null;
  availabilityStats?: AvailabilityStat[] | null;
  selectedPeriod: AvailabilityPeriod;
}

const formatLatency = (value: number | null | undefined) =>
  typeof value === "number" ? `${value} ms` : "—";

/** NieR 风格角落装饰：外框方块 + 内部实心方块 */
const CornerPlus = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={cn("absolute h-4 w-4 text-muted-foreground/40", className)}
  >
    <rect x="2" y="2" width="20" height="20" />
    <rect x="8" y="8" width="8" height="8" fill="currentColor" stroke="none" />
  </svg>
);

export function ProviderCard({
  timeline,
  timeToNextRefresh,
  availabilityStats,
  selectedPeriod,
}: ProviderCardProps) {
  const { latest, items } = timeline;
  const preset = STATUS_META[latest.status];
  const isMaintenance = latest.status === "maintenance";
  const officialStatus = latest.officialStatus;
  const officialStatusMeta = officialStatus
    ? OFFICIAL_STATUS_META[officialStatus.status]
    : null;
  const banner = officialStatusMeta?.bannerLabel ? officialStatusMeta : null;

  return (
    <div className={cn(
      "nier-shadow group relative flex flex-col overflow-hidden border bg-card/80 transition-transform duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5",
      banner
        ? banner.bannerBorder
        : "border-foreground/30 hover:border-foreground/60"
    )}>
      <CornerPlus className="left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100" />
      <CornerPlus className="right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100" />

      {banner && officialStatus && (
        <div className={cn(
          "flex items-start gap-2.5 border-b px-4 py-2.5 sm:px-5 sm:py-3",
          banner.bannerBg
        )}>
          <div className="relative mt-0.5 flex-shrink-0">
            <AlertTriangle className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-current animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold sm:text-sm">
              {banner.bannerLabel}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug opacity-80 sm:text-xs">
              {officialStatus.message || banner.description}
            </p>
            {officialStatus.affectedComponents && officialStatus.affectedComponents.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {officialStatus.affectedComponents.map((c, i) => (
                  <span key={`${c}-${i}`} className="rounded bg-current/10 px-1.5 py-0.5 text-[10px] font-medium">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NieR 存档栏式深色标题条 */}
      <div className="flex items-center justify-between gap-3 bg-foreground px-4 py-2.5 text-background sm:px-5">
        <h3 className="nier-marker min-w-0 truncate text-sm font-bold uppercase tracking-widest sm:text-base">
          {latest.name}
        </h3>
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest sm:text-xs">
          <span className={cn("h-2 w-2", preset.dot)} />
          {preset.label}
        </span>
      </div>

      <div className={cn("flex-1 p-4 sm:p-5", banner && "opacity-60")}>
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center border border-foreground/30 bg-background/60 sm:h-12 sm:w-12">
              <div className="scale-75 sm:scale-100">
                <ProviderIcon type={latest.type} size={26} className="text-foreground/80" />
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex shrink-0 items-center gap-1 bg-muted px-2 py-0.5 font-semibold text-foreground/70">
                {PROVIDER_LABEL[latest.type]}
              </span>
              <span className="truncate font-mono font-medium text-foreground/50">{latest.model}</span>
            </div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="border border-foreground/20 bg-muted/30 p-3 transition-colors group-hover:bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">对话延迟</span>
            </div>
            <div className="mt-1 font-mono text-lg font-medium leading-none text-foreground">
              {formatLatency(latest.latencyMs)}
            </div>
          </div>

          <div className="border border-foreground/20 bg-muted/30 p-3 transition-colors group-hover:bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Radio className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">端点 PING</span>
            </div>
            <div className="mt-1 font-mono text-lg font-medium leading-none text-foreground">
              {formatLatency(latest.pingLatencyMs)}
            </div>
          </div>
        </div>

        <div className="border-t border-border/30 pt-4">
          <AvailabilityStats stats={availabilityStats} period={selectedPeriod} isMaintenance={isMaintenance} />
        </div>
      </div>

      {/* Timeline Section - Visual separation */}
      <div className="border-t border-border/40 bg-muted/10 px-5 py-4">
        <StatusTimeline items={items} nextRefreshInMs={timeToNextRefresh} isMaintenance={isMaintenance} />
      </div>
    </div>
  );
}
