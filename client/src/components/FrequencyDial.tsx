import { useCallback, useMemo, useRef, useState, type PointerEvent, type WheelEvent, type KeyboardEvent } from "react";
import { Minus, Plus } from "lucide-react";
import type { RadioStation } from "../types/radio";

const MIN_FREQ = 87.5;
const MAX_FREQ = 108.0;
const STEP = 0.1;
const PX_PER_STEP = 18; // how many pixels of drag move the dial by one 0.1 MHz step
const MAJOR_TICKS = [88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// Avoid floating point drift (e.g. 98.30000000000001) when stepping.
function roundToStep(n: number) {
  return Math.round(n / STEP) * STEP;
}

interface FrequencyDialProps {
  frequency: number;
  onChange: (frequency: number) => void;
  stations: RadioStation[];
}

export default function FrequencyDial({ frequency, onChange, stations }: FrequencyDialProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startFreq: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const freqStations = useMemo(() => stations.filter((s): s is RadioStation & { frequency: number } => typeof s.frequency === "number"), [stations]);

  const matchedStation = useMemo(
    () => freqStations.find((s) => Math.abs(s.frequency - frequency) < 0.05) ?? null,
    [freqStations, frequency]
  );

  const commit = useCallback(
    (next: number) => {
      onChange(clamp(roundToStep(next), MIN_FREQ, MAX_FREQ));
    },
    [onChange]
  );

  const onPointerDown = (e: PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startFreq: frequency };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragState.current) return;
    const deltaPx = e.clientX - dragState.current.startX;
    // Dragging left moves the dial "forward" (like pulling a filmstrip),
    // increasing frequency; feels natural for a horizontal tuner.
    const deltaSteps = -deltaPx / PX_PER_STEP;
    commit(dragState.current.startFreq + deltaSteps * STEP);
  };

  const endDrag = () => {
    dragState.current = null;
    setDragging(false);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY > 0 || e.deltaX > 0 ? 1 : -1;
    commit(frequency + direction * STEP);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const big = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      commit(frequency + STEP * big);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      commit(frequency - STEP * big);
    } else if (e.key === "Home") {
      commit(MIN_FREQ);
    } else if (e.key === "End") {
      commit(MAX_FREQ);
    }
  };

  // Build a strip of ticks spanning the whole range; translate it so the
  // current frequency lines up under the fixed center indicator.
  const totalSteps = Math.round((MAX_FREQ - MIN_FREQ) / STEP);
  const offsetSteps = Math.round((frequency - MIN_FREQ) / STEP);
  const translateX = -offsetSteps * PX_PER_STEP;

  return (
    <div className="select-none">
      <div className="mb-3 text-center">
        <div className="font-display text-5xl font-bold tracking-tight text-accent-secondary [text-shadow:0_0_24px_rgba(242,181,68,0.45)]">
          {frequency.toFixed(1)}
          <span className="ml-1.5 align-top text-lg font-semibold text-accent">FM</span>
        </div>
        <p className="mt-1 min-h-[1.25rem] text-sm font-medium">
          {matchedStation ? (
            <span className="text-success">{matchedStation.name.toUpperCase()}</span>
          ) : (
            <span className="text-text-secondary">No station available</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Decrease frequency by 0.1"
          onClick={() => commit(frequency - STEP)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card text-text-secondary hover:text-text-primary"
        >
          <Minus size={16} />
        </button>

        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="FM frequency tuner"
          aria-valuemin={MIN_FREQ}
          aria-valuemax={MAX_FREQ}
          aria-valuenow={frequency}
          aria-valuetext={`${frequency.toFixed(1)} FM${matchedStation ? `, ${matchedStation.name}` : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
          onKeyDown={onKeyDown}
          className={`relative h-16 flex-1 overflow-hidden rounded-2xl bg-card shadow-[inset_0_0_22px_-4px_rgba(0,0,0,0.6)] ring-1 ring-accent-secondary/15 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          {/* center indicator */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-0.5 -translate-x-1/2 bg-accent shadow-[0_0_10px_1px_rgba(232,117,34,0.75)]" />
          <div className="pointer-events-none absolute left-1/2 top-1 z-10 h-2 w-2 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(232,117,34,0.8)]" />

          <div
            className="absolute top-1/2 flex -translate-y-1/2 items-end"
            style={{
              transform: `translate(${translateX}px, -50%)`,
              left: "50%",
              transition: dragging ? "none" : "transform 120ms ease-out",
            }}
          >
            {Array.from({ length: totalSteps + 1 }).map((_, i) => {
              const value = Math.round((MIN_FREQ + i * STEP) * 10) / 10;
              const isMajor = MAJOR_TICKS.includes(Math.round(value));
              const hasStation = freqStations.some((s) => Math.abs(s.frequency - value) < 0.05);
              return (
                <div key={i} style={{ width: PX_PER_STEP }} className="flex flex-col items-center">
                  <div
                    className={`rounded-full ${
                      hasStation ? "bg-accent-secondary" : isMajor ? "bg-text-secondary" : "bg-white/15"
                    }`}
                    style={{
                      width: hasStation ? 3 : isMajor ? 2 : 1,
                      height: hasStation ? 22 : isMajor ? 18 : 10,
                    }}
                  />
                  {isMajor && <span className="mt-1 text-[10px] text-text-secondary">{Math.round(value)}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Increase frequency by 0.1"
          onClick={() => commit(frequency + STEP)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card text-text-secondary hover:text-text-primary"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
