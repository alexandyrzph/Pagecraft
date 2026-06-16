"use client";

import { cn } from "@/lib/utils";
import type { DashboardFilter } from "@/lib/dashboard/filter";

export function SegmentedFilter({
  value,
  onChange,
  counts,
}: {
  value: DashboardFilter;
  onChange: (f: DashboardFilter) => void;
  counts: { all: number; live: number; drafts: number };
}) {
  const tabs: { k: DashboardFilter; label: string }[] = [
    { k: "all", label: `All ${counts.all}` },
    { k: "live", label: `Live ${counts.live}` },
    { k: "drafts", label: `Drafts ${counts.drafts}` },
  ];
  return (
    <div className="flex gap-1 rounded-[10px] bg-[#f1f3f5] p-[3px]">
      {tabs.map((t) => (
        <button
          key={t.k}
          onClick={() => onChange(t.k)}
          className={cn(
            "rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors",
            value === t.k
              ? "bg-white font-semibold text-[#111827] shadow-xs"
              : "font-medium text-[#6b7280] hover:text-[#111827]",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
