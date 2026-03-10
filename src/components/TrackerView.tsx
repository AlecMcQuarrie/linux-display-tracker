"use client";

import { useState } from "react";
import type {
  TrackerData,
  GroupData,
  ItemResult,
  ProtocolResult,
  IssuesResult,
  MergeRequestsResult,
  FetchError,
} from "@/lib/fetch-tracker-data";

type Tab = "hdr" | "vrr";

// ─── Summary helpers ─────────────────────────────────────────

interface FeatureSummary {
  protocolStatus: "stable" | "staging" | "not_found" | "unknown";
  protocolName: string;
  totalOpenIssues: number;
  totalClosedIssues: number;
  totalOpenMRs: number;
  totalMergedMRs: number;
  mostRecentActivity: string | null;
  compositorHighlights: {
    name: string;
    openIssues: number;
    mergedMRs: number;
  }[];
}

function computeSummary(groups: GroupData[]): FeatureSummary {
  let protocolStatus: FeatureSummary["protocolStatus"] = "unknown";
  let protocolName = "";
  let totalOpenIssues = 0;
  let totalClosedIssues = 0;
  let totalOpenMRs = 0;
  let totalMergedMRs = 0;
  let mostRecentActivity: string | null = null;
  const compositorHighlights: FeatureSummary["compositorHighlights"] = [];

  for (const group of groups) {
    let groupOpenIssues = 0;
    let groupMergedMRs = 0;

    for (const item of group.items) {
      if (item.kind === "protocol") {
        protocolStatus = item.location;
        protocolName = item.name;
      } else if (item.kind === "issues") {
        totalOpenIssues += item.openCount;
        totalClosedIssues += item.closedCount;
        groupOpenIssues += item.openCount;
        for (const r of item.recent) {
          if (!mostRecentActivity || r.updated > mostRecentActivity) {
            mostRecentActivity = r.updated;
          }
        }
      } else if (item.kind === "merge_requests") {
        totalOpenMRs += item.openCount;
        totalMergedMRs += item.mergedCount;
        groupMergedMRs += item.mergedCount;
        for (const r of item.recent) {
          if (!mostRecentActivity || r.updated > mostRecentActivity) {
            mostRecentActivity = r.updated;
          }
        }
      }
    }

    if (group.name !== "Wayland Protocols" && (groupOpenIssues > 0 || groupMergedMRs > 0)) {
      compositorHighlights.push({
        name: group.name,
        openIssues: groupOpenIssues,
        mergedMRs: groupMergedMRs,
      });
    }
  }

  compositorHighlights.sort((a, b) => (b.openIssues + b.mergedMRs) - (a.openIssues + a.mergedMRs));

  return {
    protocolStatus,
    protocolName,
    totalOpenIssues,
    totalClosedIssues,
    totalOpenMRs,
    totalMergedMRs,
    mostRecentActivity,
    compositorHighlights,
  };
}

function SummaryCard({
  title,
  summary,
}: {
  title: string;
  summary: FeatureSummary;
}) {
  const protocolBadge = {
    stable: { label: "Stable", cls: "text-green-400" },
    staging: { label: "Staging", cls: "text-yellow-400" },
    not_found: { label: "Not Found", cls: "text-red-400" },
    unknown: { label: "Unknown", cls: "text-white/40" },
  }[summary.protocolStatus];

  const totalIssues = summary.totalOpenIssues + summary.totalClosedIssues;
  const totalMRs = summary.totalOpenMRs + summary.totalMergedMRs;
  const closedRatio =
    totalIssues > 0
      ? Math.round((summary.totalClosedIssues / totalIssues) * 100)
      : 0;
  const mergedRatio =
    totalMRs > 0
      ? Math.round((summary.totalMergedMRs / totalMRs) * 100)
      : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="mt-4 space-y-3 text-sm">
        {/* Protocol */}
        <div className="flex items-center justify-between">
          <span className="text-white/50">Protocol</span>
          <span>
            <span className="font-mono text-xs text-white/70">
              {summary.protocolName}
            </span>{" "}
            <span className={`text-xs font-medium ${protocolBadge.cls}`}>
              {protocolBadge.label}
            </span>
          </span>
        </div>

        {/* Issues */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-white/50">Tracked issues</span>
            <span className="text-xs">
              <span className="text-green-400">
                {summary.totalOpenIssues} open
              </span>
              <span className="text-white/20"> · </span>
              <span className="text-white/40">
                {summary.totalClosedIssues} closed
              </span>
            </span>
          </div>
          {totalIssues > 0 && (
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-green-400/40"
                style={{ width: `${closedRatio}%` }}
              />
            </div>
          )}
          {totalIssues > 0 && (
            <p className="mt-1 text-[10px] text-white/25">
              {closedRatio}% of tracked issues resolved
            </p>
          )}
        </div>

        {/* MRs */}
        {totalMRs > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Merge requests</span>
              <span className="text-xs">
                <span className="text-green-400">
                  {summary.totalOpenMRs} open
                </span>
                <span className="text-white/20"> · </span>
                <span className="text-purple-400">
                  {summary.totalMergedMRs} merged
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-purple-400/40"
                style={{ width: `${mergedRatio}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-white/25">
              {mergedRatio}% of tracked MRs merged
            </p>
          </div>
        )}

        {/* Most recent activity */}
        {summary.mostRecentActivity && (
          <div className="flex items-center justify-between">
            <span className="text-white/50">Latest activity</span>
            <span className="text-xs text-white/40">
              {timeAgo(summary.mostRecentActivity)}
            </span>
          </div>
        )}
      </div>

      {/* Per-compositor breakdown */}
      {summary.compositorHighlights.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-white/25">
            Activity by project
          </p>
          <div className="space-y-1.5">
            {summary.compositorHighlights.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-white/60">{c.name}</span>
                <span className="text-white/30">
                  {c.openIssues > 0 && (
                    <span className="text-green-400/70">
                      {c.openIssues} open
                    </span>
                  )}
                  {c.openIssues > 0 && c.mergedMRs > 0 && (
                    <span className="text-white/15"> · </span>
                  )}
                  {c.mergedMRs > 0 && (
                    <span className="text-purple-400/70">
                      {c.mergedMRs} merged
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Existing helpers ────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function ProtocolCard({ item }: { item: ProtocolResult }) {
  const badge = {
    stable: {
      label: "Stable",
      cls: "bg-green-400/10 border-green-400/30 text-green-400",
    },
    staging: {
      label: "Staging",
      cls: "bg-yellow-400/10 border-yellow-400/30 text-yellow-400",
    },
    not_found: {
      label: "Not Found",
      cls: "bg-red-400/10 border-red-400/30 text-red-400",
    },
  }[item.location];

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-white/90">{item.name}</span>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-white/40">
        {item.location === "stable"
          ? "Protocol is finalized and in the stable set."
          : item.location === "staging"
            ? "Protocol is in staging — functional but may still change."
            : "Protocol not yet present in wayland-protocols."}
      </p>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-blue-400 hover:text-blue-300"
      >
        View repository ↗
      </a>
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const isOpen = state === "opened" || state === "open";
  const isMerged = state === "merged";
  const cls = isOpen
    ? "bg-green-400/10 text-green-400"
    : isMerged
      ? "bg-purple-400/10 text-purple-400"
      : "bg-white/5 text-white/40";
  const label = isOpen ? "open" : isMerged ? "merged" : "closed";
  return (
    <span
      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function RecentList({
  items,
}: {
  items: { title: string; url: string; state: string; updated: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs">
          <StateBadge state={item.state} />
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-white/60 hover:text-white/90"
          >
            {item.title}
          </a>
          <span className="shrink-0 text-white/25">{timeAgo(item.updated)}</span>
        </li>
      ))}
    </ul>
  );
}

function IssuesCard({ item }: { item: IssuesResult }) {
  return (
    <div className="px-6 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-sm text-white/90">{item.name}</span>
        <div className="flex gap-3 text-xs">
          <span className="text-green-400">{item.openCount} open</span>
          <span className="text-white/20">·</span>
          <span className="text-white/40">{item.closedCount} closed</span>
          {item.totalCount > item.openCount + item.closedCount && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-white/30">{item.totalCount} total</span>
            </>
          )}
        </div>
      </div>
      <RecentList items={item.recent} />
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-xs text-blue-400 hover:text-blue-300"
      >
        View all issues ↗
      </a>
    </div>
  );
}

function MRCard({ item }: { item: MergeRequestsResult }) {
  return (
    <div className="px-6 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-sm text-white/90">{item.name}</span>
        <div className="flex gap-3 text-xs">
          <span className="text-green-400">{item.openCount} open</span>
          <span className="text-white/20">·</span>
          <span className="text-purple-400">{item.mergedCount} merged</span>
          <span className="text-white/20">·</span>
          <span className="text-white/40">{item.closedCount} closed</span>
        </div>
      </div>
      <RecentList items={item.recent} />
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-xs text-blue-400 hover:text-blue-300"
      >
        View all merge requests ↗
      </a>
    </div>
  );
}

function ErrorCard({ item }: { item: FetchError }) {
  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-white/90">{item.name}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/40">
          Unable to fetch
        </span>
      </div>
      <p className="mt-1 text-xs text-white/30">{item.message}</p>
    </div>
  );
}

function ItemCard({ item }: { item: ItemResult }) {
  switch (item.kind) {
    case "protocol":
      return <ProtocolCard item={item} />;
    case "issues":
      return <IssuesCard item={item} />;
    case "merge_requests":
      return <MRCard item={item} />;
    case "error":
      return <ErrorCard item={item} />;
  }
}

function GroupCard({ group }: { group: GroupData }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="border-b border-white/10 px-6 py-4">
        <h3 className="text-lg font-semibold">
          <span className="mr-2">{group.icon}</span>
          {group.name}
        </h3>
      </div>
      <div className="divide-y divide-white/5">
        {group.items.map((item, i) => (
          <ItemCard key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function TrackerView({ data }: { data: TrackerData }) {
  const [tab, setTab] = useState<Tab>("hdr");
  const groups = tab === "hdr" ? data.hdr : data.vrr;

  const hdrSummary = computeSummary(data.hdr);
  const vrrSummary = computeSummary(data.vrr);

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <SummaryCard title="HDR" summary={hdrSummary} />
        <SummaryCard title="VRR" summary={vrrSummary} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("hdr")}
          className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
            tab === "hdr"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          HDR
        </button>
        <button
          onClick={() => setTab("vrr")}
          className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
            tab === "vrr"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          VRR
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {groups.map((group) => (
          <GroupCard key={group.name} group={group} />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-white/20">
        Data fetched from live upstream APIs · Last refreshed{" "}
        {data.fetchedAt.slice(0, 19).replace("T", " ")} UTC
      </p>
    </>
  );
}
