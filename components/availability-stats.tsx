"use client";

import type {AvailabilityPeriod, AvailabilityStat} from "@/lib/types";
import {cn} from "@/lib/utils";

interface AvailabilityStatsProps {
  stats?: AvailabilityStat[] | null;
  period: AvailabilityPeriod;
  isMaintenance?: boolean;
}

const PERIOD_LABELS: Record<AvailabilityPeriod, string> = {
  "7d": "7 天",
  "15d": "15 天",
  "30d": "30 天",
};

function getAvailabilityColorStyle(pct: number | null | undefined) {
  if (pct === null || pct === undefined) {
    return undefined;
  }
  const clamped = Math.max(0, Math.min(100, pct));
  // 0 -> 锈红, 100 -> 苔绿；低饱和贴合 NieR 色调
  const hue = (clamped / 100) * 110;
  return { color: `hsl(${hue} 38% 38%)` };
}

export function AvailabilityStats({ stats, period, isMaintenance }: AvailabilityStatsProps) {
  const current = stats?.find((item) => item.period === period);
  const pct = current?.availabilityPct ?? null;
  const pctLabel = pct === null ? "—" : `${pct.toFixed(2)}%`;

  // 维护模式下的特殊展示
  if (isMaintenance) {
    return (
      <div className="flex items-center justify-between border border-dashed border-(--status-info)/40 bg-(--status-info)/5 px-3 py-2">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-(--status-info)">
            可用性 ({PERIOD_LABELS[period]})
          </p>
          <p className="text-[10px] text-(--status-info)/70">
            {current
              ? `维护前 ${current.operationalCount}/${current.totalChecks} 成功`
              : "维护中 · 已暂停统计"}
          </p>
        </div>
        <span className="font-mono text-sm font-bold text-(--status-info)">
          {pctLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          可用性 ({PERIOD_LABELS[period]})
        </p>
        <p className="text-[10px] text-muted-foreground">
          {current
            ? `${current.operationalCount}/${current.totalChecks} 成功`
            : "暂无数据"}
        </p>
      </div>
      <span
        className={cn(
          "font-mono text-sm font-bold",
          pct === null ? "text-muted-foreground" : ""
        )}
        style={getAvailabilityColorStyle(pct)}
      >
        {pctLabel}
      </span>
    </div>
  );
}
