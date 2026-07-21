"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Activity, ExternalLink, RefreshCcw} from "lucide-react";

import {GroupTags} from "@/components/group-tags";
import {ProviderCard} from "@/components/provider-card";
import {ClientTime} from "@/components/client-time";
import {fetchGroupWithCache, prefetchGroupData, setGroupCache} from "@/lib/core/group-frontend-cache";
import type {AvailabilityPeriod, ProviderTimeline} from "@/lib/types";
import type {GroupDashboardData} from "@/lib/core/group-data";
import {cn} from "@/lib/utils";

interface GroupDashboardViewProps {
  groupName: string;
  initialData: GroupDashboardData;
}

/** 计算所有 Provider 中最近一次检查的时间戳（毫秒） */
const getLatestCheckTimestamp = (timelines: ProviderTimeline[]) => {
  const timestamps = timelines.map((timeline) =>
    new Date(timeline.latest.checkedAt).getTime()
  );
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
};

const computeRemainingMs = (
  pollIntervalMs: number | null | undefined,
  latestCheckTimestamp: number | null,
  clock: number = Date.now()
) => {
  if (!pollIntervalMs || pollIntervalMs <= 0 || latestCheckTimestamp === null) {
    return null;
  }
  const remaining = pollIntervalMs - (clock - latestCheckTimestamp);
  return Math.max(0, remaining);
};

const PERIOD_OPTIONS: Array<{ value: AvailabilityPeriod; label: string }> = [
  { value: "7d", label: "7 天" },
  { value: "15d", label: "15 天" },
  { value: "30d", label: "30 天" },
];

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

/**
 * 分组 Dashboard 视图
 * - 展示单个分组内的所有 Provider 卡片
 * - 支持客户端定时刷新
 */
export function GroupDashboardView({ groupName, initialData }: GroupDashboardViewProps) {
  const [data, setData] = useState(initialData);
  const [selectedPeriod, setSelectedPeriod] = useState<AvailabilityPeriod>(
    initialData.trendPeriod ?? "7d"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lockRef = useRef(false);
  const [timeToNextRefresh, setTimeToNextRefresh] = useState<number | null>(() =>
    computeRemainingMs(
      initialData.pollIntervalMs,
      getLatestCheckTimestamp(initialData.providerTimelines),
      initialData.generatedAt
    )
  );
  const latestCheckTimestamp = useMemo(
    () => getLatestCheckTimestamp(data.providerTimelines),
    [data.providerTimelines]
  );

  const refresh = useCallback(
    async (
      period?: AvailabilityPeriod,
      forceFresh?: boolean,
      revalidateIfFresh?: boolean
    ) => {
    if (lockRef.current) {
      return;
    }
    lockRef.current = true;
    setIsRefreshing(true);
    try {
      const targetPeriod = period ?? selectedPeriod;
      const result = await fetchGroupWithCache({
        groupName,
        trendPeriod: targetPeriod,
        forceFresh,
        revalidateIfFresh,
        onBackgroundUpdate: (newData) => {
          setData(newData);
        },
      });
      setData(result.data);
    } catch (error) {
      console.error("[check-cx] 分组自动刷新失败", error);
    } finally {
      setIsRefreshing(false);
      lockRef.current = false;
    }
  }, [groupName, selectedPeriod]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setData(initialData);
      if (initialData.trendPeriod) {
        setGroupCache(groupName, initialData.trendPeriod, initialData);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [groupName, initialData]);

  useEffect(() => {
    const currentPeriod = data.trendPeriod ?? "7d";
    prefetchGroupData(groupName, ["7d", "15d", "30d"], currentPeriod).catch(() => undefined);
  }, [data.trendPeriod, groupName]);

  useEffect(() => {
    if (!data.pollIntervalMs || data.pollIntervalMs <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      refresh(undefined, false, true).catch(() => undefined);
    }, data.pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [data.pollIntervalMs, refresh]);

  useEffect(() => {
    if (selectedPeriod === data.trendPeriod) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      refresh(selectedPeriod).catch(() => undefined);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [data.trendPeriod, refresh, selectedPeriod]);

  useEffect(() => {
    if (!data.pollIntervalMs || data.pollIntervalMs <= 0 || latestCheckTimestamp === null) {
      const frame = window.requestAnimationFrame(() => {
        setTimeToNextRefresh(null);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const updateCountdown = () => {
      setTimeToNextRefresh(
        computeRemainingMs(data.pollIntervalMs, latestCheckTimestamp)
      );
    };

    const frame = window.requestAnimationFrame(updateCountdown);
    const countdownTimer = window.setInterval(updateCountdown, 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(countdownTimer);
    };
  }, [data.pollIntervalMs, latestCheckTimestamp]);

  const { providerTimelines, total, lastUpdated, pollIntervalLabel, displayName } = data;
  const { availabilityStats } = data;

  // 根据卡片数量决定宽屏列数
  const gridColsClass = useMemo(() => {
    if (total > 4) {
      return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
    }
    return "grid-cols-1 md:grid-cols-2";
  }, [total]);

  // 计算状态统计
  const statusSummary = useMemo(() => {
    const counts = { operational: 0, degraded: 0, failed: 0, validation_failed: 0, maintenance: 0, error: 0 };
    for (const timeline of providerTimelines) {
      const status = timeline.latest.status;
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    }
    return counts;
  }, [providerTimelines]);

  return (
    <div className="relative">
      <CornerPlus className="fixed left-4 top-4 hidden h-6 w-6 text-border md:left-8 md:top-8 md:block" />
      <CornerPlus className="fixed right-4 top-4 hidden h-6 w-6 text-border md:right-8 md:top-8 md:block" />
      <CornerPlus className="fixed bottom-4 left-4 hidden h-6 w-6 text-border md:bottom-8 md:left-8 md:block" />
      <CornerPlus className="fixed bottom-4 right-4 hidden h-6 w-6 text-border md:bottom-8 md:right-8 md:block" />

      <header className="relative z-10 mb-8 flex flex-col justify-between gap-6 sm:mb-12 sm:gap-8 lg:flex-row lg:items-end">
        <div className="space-y-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="nier-shadow flex h-7 w-7 items-center justify-center bg-foreground text-background sm:h-8 sm:w-8">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.35em] text-muted-foreground sm:text-sm">
              Group View
            </span>
          </div>

          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="nier-text-shadow min-w-0 break-words text-2xl font-extrabold uppercase leading-tight tracking-[0.1em] sm:text-4xl sm:tracking-[0.15em] md:text-5xl">
                {displayName}
              </h1>
              <GroupTags tags={data.tags} />
              {data.websiteUrl && (
                <a
                  href={data.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nier-invert-hover flex items-center justify-center border border-foreground/30 bg-muted/50 p-2 text-muted-foreground"
                >
                  <ExternalLink className="h-6 w-6" />
                </a>
              )}
            </div>
            <div className="nier-rule w-full" />
          </div>
          
           <div className="flex flex-wrap items-center gap-2.5">
            {statusSummary.operational > 0 && (
               <span className="inline-flex items-center gap-1.5 border border-(--status-ok)/40 bg-(--status-ok)/10 px-2.5 py-0.5 text-xs font-medium text-(--status-ok)">
                 <span className="h-1.5 w-1.5 bg-(--status-ok)" />
                {statusSummary.operational} 正常
              </span>
            )}
            {statusSummary.degraded > 0 && (
               <span className="inline-flex items-center gap-1.5 border border-(--status-warn)/40 bg-(--status-warn)/10 px-2.5 py-0.5 text-xs font-medium text-(--status-warn)">
                <span className="h-1.5 w-1.5 bg-(--status-warn)" />
                {statusSummary.degraded} 延迟
              </span>
            )}
            {statusSummary.failed > 0 && (
               <span className="inline-flex items-center gap-1.5 border border-(--status-bad)/40 bg-(--status-bad)/10 px-2.5 py-0.5 text-xs font-medium text-(--status-bad)">
                <span className="h-1.5 w-1.5 bg-(--status-bad)" />
                {statusSummary.failed} 异常
              </span>
            )}
            {statusSummary.validation_failed > 0 && (
               <span className="inline-flex items-center gap-1.5 border border-(--status-warn)/40 bg-(--status-warn)/10 px-2.5 py-0.5 text-xs font-medium text-(--status-warn)">
                <span className="h-1.5 w-1.5 bg-(--status-warn)" />
                {statusSummary.validation_failed} 验证失败
              </span>
            )}
            {statusSummary.error > 0 && (
               <span className="inline-flex items-center gap-1.5 border border-(--status-bad)/40 bg-(--status-bad)/10 px-2.5 py-0.5 text-xs font-medium text-(--status-bad)">
                <span className="h-1.5 w-1.5 bg-(--status-bad)" />
                {statusSummary.error} 错误
              </span>
            )}
             {statusSummary.maintenance > 0 && (
               <span className="inline-flex items-center gap-1.5 border border-(--status-info)/40 bg-(--status-info)/10 px-2.5 py-0.5 text-xs font-medium text-(--status-info)">
                <span className="h-1.5 w-1.5 bg-(--status-info)" />
                {statusSummary.maintenance} 维护
              </span>
            )}
            <span className="text-xs text-muted-foreground/60">|</span>
            <span className="text-xs text-muted-foreground">{total} 个配置</span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 lg:items-end">
           <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
             <span className="pl-1">可用性区间</span>
             <div className="flex items-center gap-1 rounded-full bg-muted/30 p-0.5">
               {PERIOD_OPTIONS.map((option) => (
                 <button
                   key={option.value}
                   type="button"
                   onClick={() => setSelectedPeriod(option.value)}
                   className={cn(
                     "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                     selectedPeriod === option.value
                       ? "nier-arrows bg-foreground px-3 text-background"
                       : "text-muted-foreground hover:text-foreground"
                   )}
                 >
                   {option.label}
                 </button>
               ))}
             </div>
           </div>

           {/* Status Pill */}
           <div className="nier-shadow flex items-center gap-2 border border-foreground/40 bg-background/60 px-4 py-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping bg-(--status-ok) opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 bg-(--status-ok)" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.25em]">Operational</span>
           </div>

           {lastUpdated && (
             <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <RefreshCcw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                  <span>更新于 <ClientTime value={lastUpdated} /></span>
                </div>
                <span className="opacity-30">|</span>
                <span>{pollIntervalLabel} 轮询</span>
                <button
                  type="button"
                  onClick={() => refresh(selectedPeriod, true)}
                  disabled={isRefreshing}
                  className={cn(
                    "nier-invert-hover border border-foreground/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                    isRefreshing && "cursor-not-allowed opacity-60"
                  )}
                >
                  刷新
                </button>
             </div>
           )}
        </div>
      </header>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/50 bg-muted/20 py-20 text-center">
            <div className="mb-4 rounded-full bg-muted/50 p-4">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">该分组下暂无配置</h3>
          </div>
      ) : (
        <section className={`grid gap-6 ${gridColsClass}`}>
          {providerTimelines.map((timeline) => (
            <ProviderCard
              key={timeline.id}
              timeline={timeline}
              timeToNextRefresh={timeToNextRefresh}
              availabilityStats={availabilityStats[timeline.id]}
              selectedPeriod={selectedPeriod}
            />
          ))}
        </section>
      )}
    </div>
  );
}
