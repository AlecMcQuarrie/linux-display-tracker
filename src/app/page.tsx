import { fetchTrackerData } from "@/lib/fetch-tracker-data";
import TrackerView from "@/components/TrackerView";

export const revalidate = 3600;

export default async function Home() {
  const data = await fetchTrackerData();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Terminal header */}
      <header className="mb-8 border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
        <div className="text-[var(--dim)] text-xs mb-3">
          ┌──────────────────────────────────────────────────────┐
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--green)] font-bold">$</span>
          <h1 className="text-[var(--green)] text-lg sm:text-xl font-bold tracking-wide">
            linux-display-tracker
          </h1>
        </div>
        <p className="mt-1 text-xs text-[var(--dim)]">
          <span className="text-[var(--green-dim)]">&gt;</span> live monitoring of HDR &amp; VRR support on linux
        </p>
        <p className="text-xs text-[var(--dim)]">
          <span className="text-[var(--green-dim)]">&gt;</span> src: freedesktop.org, kde, gnome, github
        </p>
        <p className="text-xs text-[var(--dim)]">
          <span className="text-[var(--green-dim)]">&gt;</span> refresh: every 3600s<span className="cursor-blink"></span>
        </p>
        <div className="text-[var(--dim)] text-xs mt-3">
          └──────────────────────────────────────────────────────┘
        </div>
      </header>

      <TrackerView data={data} />

      <footer className="mt-12 border-t border-[var(--border)] pt-4 text-xs text-[var(--dim)]">
        <p>
          <span className="text-[var(--green-dim)]">#</span> data pulled live from{" "}
          <a href="https://gitlab.freedesktop.org" className="text-[var(--cyan)] hover:underline" target="_blank" rel="noopener noreferrer">
            freedesktop.org
          </a>
          {" | "}
          <a href="https://invent.kde.org" className="text-[var(--cyan)] hover:underline" target="_blank" rel="noopener noreferrer">
            kde
          </a>
          {" | "}
          <a href="https://gitlab.gnome.org" className="text-[var(--cyan)] hover:underline" target="_blank" rel="noopener noreferrer">
            gnome
          </a>
          {" | "}
          <a href="https://github.com" className="text-[var(--cyan)] hover:underline" target="_blank" rel="noopener noreferrer">
            github
          </a>
        </p>
        <p className="mt-1">
          <span className="text-[var(--green-dim)]">#</span> source:{" "}
          <a
            href="https://github.com/AlecMcQuarrie/linux-display-tracker"
            className="text-[var(--cyan)] hover:underline"
          >
            github.com/AlecMcQuarrie/linux-display-tracker
          </a>
        </p>
      </footer>
    </div>
  );
}
