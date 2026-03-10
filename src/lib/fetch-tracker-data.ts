// ─── Types ───────────────────────────────────────────────────

export interface ProtocolResult {
  kind: "protocol";
  name: string;
  location: "stable" | "staging" | "not_found";
  url: string;
}

export interface IssuesResult {
  kind: "issues";
  name: string;
  totalCount: number;
  openCount: number;
  closedCount: number;
  recent: { title: string; url: string; state: string; updated: string }[];
  url: string;
}

export interface MergeRequestsResult {
  kind: "merge_requests";
  name: string;
  totalCount: number;
  openCount: number;
  mergedCount: number;
  closedCount: number;
  recent: { title: string; url: string; state: string; updated: string }[];
  url: string;
}

export interface FetchError {
  kind: "error";
  name: string;
  message: string;
}

export type ItemResult =
  | ProtocolResult
  | IssuesResult
  | MergeRequestsResult
  | FetchError;

export interface GroupData {
  name: string;
  icon: string;
  items: ItemResult[];
}

export interface TrackerData {
  hdr: GroupData[];
  vrr: GroupData[];
  fetchedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────

const REVALIDATE = 3600;

async function gitlabTreeExists(
  instance: string,
  project: string,
  path: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${instance}/api/v4/projects/${encodeURIComponent(project)}/repository/tree?path=${encodeURIComponent(path)}&per_page=1`,
      { next: { revalidate: REVALIDATE } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

async function checkProtocol(
  instance: string,
  project: string,
  protocolName: string,
  stablePath: string,
  stagingPath: string,
  humanUrl: string
): Promise<ProtocolResult> {
  const [inStable, inStaging] = await Promise.all([
    gitlabTreeExists(instance, project, stablePath),
    gitlabTreeExists(instance, project, stagingPath),
  ]);
  return {
    kind: "protocol",
    name: protocolName,
    location: inStable ? "stable" : inStaging ? "staging" : "not_found",
    url: humanUrl,
  };
}

async function fetchGitLabIssues(
  instance: string,
  project: string,
  search: string,
  name: string,
  humanUrl: string
): Promise<IssuesResult | FetchError> {
  try {
    const base = `${instance}/api/v4/projects/${encodeURIComponent(project)}/issues`;
    const q = encodeURIComponent(search);
    const res = await fetch(
      `${base}?search=${q}&state=all&per_page=20&order_by=updated_at&sort=desc`,
      { next: { revalidate: REVALIDATE } }
    );
    if (!res.ok) throw new Error(`GitLab API ${res.status}`);
    const issues = await res.json();
    if (!Array.isArray(issues)) throw new Error("Unexpected response format");
    const totalHeader = res.headers.get("x-total");
    return {
      kind: "issues",
      name,
      totalCount: totalHeader ? parseInt(totalHeader) : issues.length,
      openCount: issues.filter((i: { state: string }) => i.state === "opened").length,
      closedCount: issues.filter((i: { state: string }) => i.state === "closed").length,
      recent: issues.slice(0, 5).map((i: { title: string; web_url: string; state: string; updated_at: string }) => ({
        title: i.title,
        url: i.web_url,
        state: i.state,
        updated: i.updated_at,
      })),
      url: humanUrl,
    };
  } catch (e) {
    return { kind: "error", name, message: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchGitLabMRs(
  instance: string,
  project: string,
  search: string,
  name: string,
  humanUrl: string
): Promise<MergeRequestsResult | FetchError> {
  try {
    const base = `${instance}/api/v4/projects/${encodeURIComponent(project)}/merge_requests`;
    const q = encodeURIComponent(search);
    const res = await fetch(
      `${base}?search=${q}&state=all&per_page=20&order_by=updated_at&sort=desc`,
      { next: { revalidate: REVALIDATE } }
    );
    if (!res.ok) throw new Error(`GitLab API ${res.status}`);
    const mrs = await res.json();
    if (!Array.isArray(mrs)) throw new Error("Unexpected response format");
    const totalHeader = res.headers.get("x-total");
    return {
      kind: "merge_requests",
      name,
      totalCount: totalHeader ? parseInt(totalHeader) : mrs.length,
      openCount: mrs.filter((m: { state: string }) => m.state === "opened").length,
      mergedCount: mrs.filter((m: { state: string }) => m.state === "merged").length,
      closedCount: mrs.filter((m: { state: string }) => m.state === "closed").length,
      recent: mrs.slice(0, 5).map((m: { title: string; web_url: string; state: string; updated_at: string }) => ({
        title: m.title,
        url: m.web_url,
        state: m.state,
        updated: m.updated_at,
      })),
      url: humanUrl,
    };
  } catch (e) {
    return { kind: "error", name, message: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchGitHubIssues(
  repo: string,
  query: string,
  name: string,
  humanUrl: string
): Promise<IssuesResult | FetchError> {
  try {
    const q = encodeURIComponent(`repo:${repo} ${query} is:issue`);
    const res = await fetch(
      `https://api.github.com/search/issues?q=${q}&per_page=30&sort=updated&order=desc`,
      {
        next: { revalidate: REVALIDATE },
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "linux-display-tracker",
        },
      }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    const items: { title: string; html_url: string; state: string; updated_at: string }[] = data.items || [];
    return {
      kind: "issues",
      name,
      totalCount: data.total_count ?? items.length,
      openCount: items.filter((i) => i.state === "open").length,
      closedCount: items.filter((i) => i.state === "closed").length,
      recent: items.slice(0, 5).map((i) => ({
        title: i.title,
        url: i.html_url,
        state: i.state,
        updated: i.updated_at,
      })),
      url: humanUrl,
    };
  } catch (e) {
    return { kind: "error", name, message: e instanceof Error ? e.message : String(e) };
  }
}


// ─── Main ────────────────────────────────────────────────────

const FD = "https://gitlab.freedesktop.org";
const KDE = "https://invent.kde.org";
const GNOME = "https://gitlab.gnome.org";
const WP = "wayland/wayland-protocols";

export async function fetchTrackerData(): Promise<TrackerData> {
  const results = await Promise.allSettled([
    // 0: HDR protocol
    checkProtocol(FD, WP, "color-management-v1",
      "stable/color-management", "staging/color-management",
      "https://gitlab.freedesktop.org/wayland/wayland-protocols"),
    // 1: KWin HDR issues (KDE uses "color management" terminology for HDR work)
    fetchGitLabIssues(KDE, "plasma/kwin", "color management", "Issues",
      "https://invent.kde.org/plasma/kwin/-/issues?search=color+management"),
    // 2: KWin HDR MRs (search HDR + colormanagement to catch both naming conventions)
    fetchGitLabMRs(KDE, "plasma/kwin", "HDR", "Merge Requests",
      "https://invent.kde.org/plasma/kwin/-/merge_requests?search=HDR"),
    // 3: Mutter HDR issues
    fetchGitLabIssues(GNOME, "GNOME/mutter", "HDR", "Issues",
      "https://gitlab.gnome.org/GNOME/mutter/-/issues?search=HDR"),
    // 4: Mutter HDR MRs
    fetchGitLabMRs(GNOME, "GNOME/mutter", "HDR", "Merge Requests",
      "https://gitlab.gnome.org/GNOME/mutter/-/merge_requests?search=HDR"),
    // 5: Gamescope HDR
    fetchGitHubIssues("ValveSoftware/gamescope", "HDR", "HDR Issues",
      "https://github.com/ValveSoftware/gamescope/issues?q=HDR"),
    // 6: wlroots HDR (search "color-management" — wlroots uses this term)
    fetchGitHubIssues("swaywm/wlroots", "color-management", "Color Management Issues",
      "https://github.com/swaywm/wlroots/issues?q=color-management"),
    // 7: Mesa HDR
    fetchGitLabIssues(FD, "mesa/mesa", "HDR", "HDR Issues",
      "https://gitlab.freedesktop.org/mesa/mesa/-/issues?search=HDR"),
    // 8: VRR protocol
    checkProtocol(FD, WP, "tearing-control-v1",
      "stable/tearing-control", "staging/tearing-control",
      "https://gitlab.freedesktop.org/wayland/wayland-protocols"),
    // 9: KWin VRR issues
    fetchGitLabIssues(KDE, "plasma/kwin", "VRR", "Issues",
      "https://invent.kde.org/plasma/kwin/-/issues?search=VRR"),
    // 10: KWin VRR MRs
    fetchGitLabMRs(KDE, "plasma/kwin", "VRR", "Merge Requests",
      "https://invent.kde.org/plasma/kwin/-/merge_requests?search=VRR"),
    // 11: Mutter VRR issues
    fetchGitLabIssues(GNOME, "GNOME/mutter", "VRR", "Issues",
      "https://gitlab.gnome.org/GNOME/mutter/-/issues?search=VRR"),
    // 12: Mutter VRR MRs
    fetchGitLabMRs(GNOME, "GNOME/mutter", "VRR", "Merge Requests",
      "https://gitlab.gnome.org/GNOME/mutter/-/merge_requests?search=VRR"),
    // 13: Gamescope VRR
    fetchGitHubIssues("ValveSoftware/gamescope", "VRR", "VRR Issues",
      "https://github.com/ValveSoftware/gamescope/issues?q=VRR"),
    // 14: Sway VRR (sway uses "adaptive_sync" config name)
    fetchGitHubIssues("swaywm/sway", "adaptive_sync", "VRR Issues",
      "https://github.com/swaywm/sway/issues?q=adaptive_sync"),
    // 15: wlroots VRR
    fetchGitHubIssues("swaywm/wlroots", "VRR", "VRR Issues",
      "https://github.com/swaywm/wlroots/issues?q=VRR"),
  ]);

  const r = (i: number): ItemResult => {
    const result = results[i];
    if (result.status === "fulfilled") return result.value;
    return { kind: "error", name: "Unknown", message: result.reason?.message || "Fetch failed" };
  };

  return {
    hdr: [
      { name: "Wayland Protocols", icon: "📡", items: [r(0)] },
      { name: "KDE Plasma / KWin", icon: "🖥️", items: [r(1), r(2)] },
      { name: "GNOME / Mutter", icon: "👣", items: [r(3), r(4)] },
      { name: "Gamescope (Valve)", icon: "🎮", items: [r(5)] },
      { name: "wlroots / Sway", icon: "🌿", items: [r(6)] },
      { name: "Mesa (AMD/Intel)", icon: "🔴", items: [r(7)] },
    ],
    vrr: [
      { name: "Wayland Protocols", icon: "📡", items: [r(8)] },
      { name: "KDE Plasma / KWin", icon: "🖥️", items: [r(9), r(10)] },
      { name: "GNOME / Mutter", icon: "👣", items: [r(11), r(12)] },
      { name: "Gamescope (Valve)", icon: "🎮", items: [r(13)] },
      { name: "wlroots / Sway", icon: "🌿", items: [r(14), r(15)] },
    ],
    fetchedAt: new Date().toISOString(),
  };
}
