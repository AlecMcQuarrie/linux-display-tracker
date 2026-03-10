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

    if (
      group.name !== "Wayland Protocols" &&
      (groupOpenIssues > 0 || groupMergedMRs > 0)
    ) {
      compositorHighlights.push({
        name: group.name,
        openIssues: groupOpenIssues,
        mergedMRs: groupMergedMRs,
      });
    }
  }

  compositorHighlights.sort(
    (a, b) => b.openIssues + b.mergedMRs - (a.openIssues + a.mergedMRs)
  );

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

function blockBar(ratio: number, width: number = 20): string {
  const filled = Math.round((ratio / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function SummaryCard({
  title,
  summary,
}: {
  title: string;
  summary: FeatureSummary;
}) {
  const protocolTag = {
    stable: { label: "STABLE", cls: "text-[var(--green)]" },
    staging: { label: "STAGING", cls: "text-[var(--amber)]" },
    not_found: { label: "NOT FOUND", cls: "text-[var(--red)]" },
    unknown: { label: "UNKNOWN", cls: "text-[var(--dim)]" },
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
    <div className="border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-2 flex items-center gap-2">
        <span className="text-[var(--green)]">╔══</span>
        <span className="text-[var(--bright)] font-bold text-sm uppercase tracking-widest">
          {title}
        </span>
        <span className="text-[var(--green)]">══╗</span>
      </div>
      <div className="px-4 py-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--dim)]">protocol:</span>
          <span>
            <span className="text-[var(--fg)]">{summary.protocolName}</span>{" "}
            <span className={protocolTag.cls}>[{protocolTag.label}]</span>
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-[var(--dim)]">issues:</span>
          <span>
            <span className="text-[var(--green)]">
              {summary.totalOpenIssues} open
            </span>
            <span className="text-[var(--dim)]"> | </span>
            <span className="text-[var(--fg)]">
              {summary.totalClosedIssues} closed
            </span>
          </span>
        </div>
        {totalIssues > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-[var(--green-dim)]">
              {blockBar(closedRatio, 16)}
            </span>
            <span className="text-[var(--dim)]">{closedRatio}% resolved</span>
          </div>
        )}

        {totalMRs > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-[var(--dim)]">merge_req:</span>
              <span>
                <span className="text-[var(--green)]">
                  {summary.totalOpenMRs} open
                </span>
                <span className="text-[var(--dim)]"> | </span>
                <span className="text-[var(--magenta)]">
                  {summary.totalMergedMRs} merged
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--magenta)]">
                {blockBar(mergedRatio, 16)}
              </span>
              <span className="text-[var(--dim)]">{mergedRatio}% merged</span>
            </div>
          </>
        )}

        {summary.mostRecentActivity && (
          <div className="flex justify-between">
            <span className="text-[var(--dim)]">last_activity:</span>
            <span className="text-[var(--fg)]">
              {timeAgo(summary.mostRecentActivity)}
            </span>
          </div>
        )}

        {summary.compositorHighlights.length > 0 && (
          <div className="border-t border-[var(--border)] pt-2 mt-2">
            <p className="text-[var(--dim)] mb-1">
              # activity by project
            </p>
            {summary.compositorHighlights.map((c) => (
              <div
                key={c.name}
                className="flex justify-between text-[11px]"
              >
                <span className="text-[var(--fg)]">{c.name}</span>
                <span>
                  {c.openIssues > 0 && (
                    <span className="text-[var(--green-dim)]">
                      {c.openIssues}o
                    </span>
                  )}
                  {c.openIssues > 0 && c.mergedMRs > 0 && (
                    <span className="text-[var(--dim)]">/</span>
                  )}
                  {c.mergedMRs > 0 && (
                    <span className="text-[var(--magenta)]">
                      {c.mergedMRs}m
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

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
  const tag = {
    stable: { label: "STABLE", cls: "text-[var(--green)]" },
    staging: { label: "STAGING", cls: "text-[var(--amber)]" },
    not_found: { label: "NOT FOUND", cls: "text-[var(--red)]" },
  }[item.location];

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[var(--bright)] text-xs">{item.name}</span>
        <span className={`text-xs font-bold ${tag.cls}`}>[{tag.label}]</span>
      </div>
      <p className="mt-1 text-[11px] text-[var(--dim)]">
        {item.location === "stable"
          ? "# finalized in the stable protocol set"
          : item.location === "staging"
            ? "# in staging -- functional but may still change"
            : "# not yet present in wayland-protocols"}
      </p>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-[11px] text-[var(--cyan)] hover:underline"
      >
        $ open repo
      </a>
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const isOpen = state === "opened" || state === "open";
  const isMerged = state === "merged";
  const cls = isOpen
    ? "text-[var(--green)]"
    : isMerged
      ? "text-[var(--magenta)]"
      : "text-[var(--dim)]";
  const label = isOpen ? "OPEN" : isMerged ? "MRGD" : "CLSD";
  return <span className={`text-[10px] font-bold shrink-0 ${cls}`}>[{label}]</span>;
}

function RecentList({
  items,
}: {
  items: { title: string; url: string; state: string; updated: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[11px]">
          <StateBadge state={item.state} />
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-[var(--fg)] hover:text-[var(--bright)] hover:underline"
          >
            {item.title}
          </a>
          <span className="shrink-0 text-[var(--dim)]">
            {timeAgo(item.updated)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function IssuesCard({ item }: { item: IssuesResult }) {
  return (
    <div className="px-4 py-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[var(--bright)] text-xs">{item.name}</span>
        <div className="flex gap-2 text-[11px]">
          <span className="text-[var(--green)]">{item.openCount} open</span>
          <span className="text-[var(--dim)]">|</span>
          <span className="text-[var(--dim)]">{item.closedCount} closed</span>
          {item.totalCount > item.openCount + item.closedCount && (
            <>
              <span className="text-[var(--dim)]">|</span>
              <span className="text-[var(--dim)]">
                {item.totalCount} total
              </span>
            </>
          )}
        </div>
      </div>
      <RecentList items={item.recent} />
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-[11px] text-[var(--cyan)] hover:underline"
      >
        $ view all issues
      </a>
    </div>
  );
}

function MRCard({ item }: { item: MergeRequestsResult }) {
  return (
    <div className="px-4 py-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[var(--bright)] text-xs">{item.name}</span>
        <div className="flex gap-2 text-[11px]">
          <span className="text-[var(--green)]">{item.openCount} open</span>
          <span className="text-[var(--dim)]">|</span>
          <span className="text-[var(--magenta)]">
            {item.mergedCount} merged
          </span>
          <span className="text-[var(--dim)]">|</span>
          <span className="text-[var(--dim)]">{item.closedCount} closed</span>
        </div>
      </div>
      <RecentList items={item.recent} />
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-[11px] text-[var(--cyan)] hover:underline"
      >
        $ view all merge requests
      </a>
    </div>
  );
}

function ErrorCard({ item }: { item: FetchError }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[var(--bright)] text-xs">{item.name}</span>
        <span className="text-[11px] text-[var(--red)] font-bold">
          [ERROR]
        </span>
      </div>
      <p className="mt-1 text-[11px] text-[var(--dim)]"># {item.message}</p>
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
    <div className="border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-2">
        <h3 className="text-xs font-bold text-[var(--bright)]">
          <span className="text-[var(--green-dim)]">┌─</span>{" "}
          {group.icon} {group.name}{" "}
          <span className="text-[var(--green-dim)]">─┐</span>
        </h3>
      </div>
      <div className="divide-y divide-[var(--border)]">
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
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <SummaryCard title="HDR" summary={hdrSummary} />
        <SummaryCard title="VRR" summary={vrrSummary} />
      </div>

      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setTab("hdr")}
          className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
            tab === "hdr"
              ? "border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5"
              : "border-[var(--border)] text-[var(--dim)] hover:text-[var(--fg)] hover:border-[var(--dim)]"
          }`}
        >
          [ HDR ]
        </button>
        <button
          onClick={() => setTab("vrr")}
          className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
            tab === "vrr"
              ? "border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5"
              : "border-[var(--border)] text-[var(--dim)] hover:text-[var(--fg)] hover:border-[var(--dim)]"
          }`}
        >
          [ VRR ]
        </button>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <GroupCard key={group.name} group={group} />
        ))}
      </div>

      <p className="mt-6 text-[11px] text-[var(--dim)]">
        # fetched from live upstream APIs | last refresh:{" "}
        {data.fetchedAt.slice(0, 19).replace("T", " ")} UTC
      </p>
    </>
  );
}
