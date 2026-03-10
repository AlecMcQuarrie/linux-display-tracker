"use client";

import { useState } from "react";
import type {
  TrackerData,
  GroupData,
  ItemResult,
  ProtocolResult,
  IssuesResult,
  MergeRequestsResult,
  ReleaseResult,
  FetchError,
} from "@/lib/fetch-tracker-data";

type Tab = "hdr" | "vrr";

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

function ReleaseCard({ item }: { item: ReleaseResult }) {
  return (
    <div className="px-6 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-sm text-white/90">{item.name}</span>
        <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-medium text-blue-400">
          {item.tag}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-white/40">
        Published {new Date(item.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
      </p>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-blue-400 hover:text-blue-300"
      >
        View release ↗
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
    case "release":
      return <ReleaseCard item={item} />;
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

  return (
    <>
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
