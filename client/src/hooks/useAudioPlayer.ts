import { useMemo } from "react";
import { usePlayerStore } from "../store/playerStore";

// Rough bitrate assumptions used only to *estimate* data usage — actual
// consumption depends entirely on the broadcaster's real stream bitrate.
const ESTIMATED_KBPS: Record<string, number> = {
  mp3: 128,
  aac: 96,
  hls: 128,
  unknown: 128,
};

export function useAudioPlayer() {
  const state = usePlayerStore();

  const approxDataUsageMbPerHour = useMemo(() => {
    const type = state.station?.streamType ?? "unknown";
    const kbps = ESTIMATED_KBPS[type] ?? ESTIMATED_KBPS.unknown;
    // kbps -> MB/hour: (kbits/s * 3600s) / 8 bits-per-byte / 1000 KB-per-MB
    return Math.round((kbps * 3600) / 8 / 1000);
  }, [state.station?.streamType]);

  return {
    ...state,
    approxDataUsageMbPerHour,
  };
}
