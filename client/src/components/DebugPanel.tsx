import { useEffect, useState } from "react";
import { Bug, PlayCircle } from "lucide-react";
import { usePlayerStore, getAudioDebugSnapshot } from "../store/playerStore";
import { radioApi } from "../services/radioApi";

const READY_STATES = ["HAVE_NOTHING", "HAVE_METADATA", "HAVE_CURRENT_DATA", "HAVE_FUTURE_DATA", "HAVE_ENOUGH_DATA"];
const NETWORK_STATES = ["NETWORK_EMPTY", "NETWORK_IDLE", "NETWORK_LOADING", "NETWORK_NO_SOURCE"];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="text-text-secondary">{label}</span>
      <span className="max-w-[60%] truncate text-right font-mono text-text-primary">{value}</span>
    </div>
  );
}

/**
 * Developer-only diagnostics panel (toggled from Settings) covering the
 * same information a `/debug/stream` page would show for the *currently
 * loaded* station — station, URL, stream type, audio element ready/
 * network state, HLS support/status, the last media error if any, and a
 * button to run the backend's stream diagnostic (HTTP status, Content-
 * Type, redirects) against the station actually loaded right now.
 */
export default function DebugPanel() {
  const station = usePlayerStore((s) => s.station);
  const status = usePlayerStore((s) => s.status);
  const [snapshot, setSnapshot] = useState(getAudioDebugSnapshot());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setSnapshot(getAudioDebugSnapshot()), 1000);
    return () => clearInterval(id);
  }, []);

  const runTest = async () => {
    if (!station) return;
    setTesting(true);
    setTestResult(null);
    const result = await radioApi.testStream(station.id);
    setTesting(false);
    setTestResult(
      result
        ? `${result.status.toUpperCase()} · ${result.contentType ?? "no content-type"} · playback: ${
            result.supportsBrowserPlayback ? "yes" : "no"
          }`
        : "Request failed — is the backend running?"
    );
  };

  return (
    <div className="rounded-card bg-bg-secondary p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        <Bug size={13} /> Audio Debug Panel
      </p>
      <div className="divide-y divide-white/5">
        <Row label="Station" value={station?.name ?? "None"} />
        <Row label="Player status" value={status} />
        <Row label="Stream URL" value={snapshot.src ?? "—"} />
        <Row label="Stream type" value={station?.streamType ?? "—"} />
        <Row
          label="Audio readyState"
          value={snapshot.readyState !== null ? `${snapshot.readyState} (${READY_STATES[snapshot.readyState]})` : "—"}
        />
        <Row
          label="Network state"
          value={snapshot.networkState !== null ? `${snapshot.networkState} (${NETWORK_STATES[snapshot.networkState]})` : "—"}
        />
        <Row label="Paused" value={String(snapshot.paused ?? "—")} />
        <Row label="Muted" value={String(snapshot.muted ?? "—")} />
        <Row label="Volume" value={snapshot.volume !== null ? snapshot.volume.toFixed(2) : "—"} />
        <Row label="HLS.js supported" value={String(snapshot.hlsSupported)} />
        <Row label="HLS.js active" value={String(snapshot.hlsActive)} />
        <Row label="Last media error" value={snapshot.lastMediaError ?? "None"} />
      </div>

      <button
        type="button"
        onClick={runTest}
        disabled={!station || testing}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-card px-3 py-2.5 text-xs font-semibold text-accent disabled:opacity-50"
      >
        <PlayCircle size={14} /> {testing ? "Testing…" : "Test current stream (backend diagnostic)"}
      </button>
      {testResult && <p className="mt-2 text-center text-[11px] text-text-secondary">{testResult}</p>}
    </div>
  );
}
