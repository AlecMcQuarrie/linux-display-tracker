import { fetchTrackerData } from "@/lib/fetch-tracker-data";
import TrackerView from "@/components/TrackerView";

export const revalidate = 3600;

export default async function Home() {
  const data = await fetchTrackerData();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Linux Display Feature Tracker
        </h1>
        <p className="mt-2 text-sm text-white/40">
          Live tracking of HDR and VRR support across Linux compositors,
          drivers, and Wayland protocols. Data sourced from GitLab and GitHub
          APIs.
        </p>
      </header>

      <TrackerView data={data} />

      <footer className="mt-16 border-t border-white/10 pt-6 text-center text-xs text-white/30">
        <p>
          Data pulled live from{" "}
          <a href="https://gitlab.freedesktop.org" className="text-blue-400/60 hover:text-blue-400" target="_blank" rel="noopener noreferrer">
            freedesktop.org
          </a>
          ,{" "}
          <a href="https://invent.kde.org" className="text-blue-400/60 hover:text-blue-400" target="_blank" rel="noopener noreferrer">
            KDE GitLab
          </a>
          ,{" "}
          <a href="https://gitlab.gnome.org" className="text-blue-400/60 hover:text-blue-400" target="_blank" rel="noopener noreferrer">
            GNOME GitLab
          </a>
          , and{" "}
          <a href="https://github.com" className="text-blue-400/60 hover:text-blue-400" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          .
          <br />
          Refreshes hourly · Source on{" "}
          <a
            href="https://github.com/AlecMcQuarrie/linux-display-tracker"
            className="text-blue-400/60 hover:text-blue-400"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
