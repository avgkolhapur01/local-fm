import { Compass, Loader2 } from "lucide-react";

interface LocationButtonProps {
  onClick: () => void;
  status: "idle" | "detecting" | "success" | "denied" | "error";
}

export default function LocationButton({ onClick, status }: LocationButtonProps) {
  const detecting = status === "detecting";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={detecting}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/15 disabled:opacity-70"
    >
      {detecting ? (
        <Loader2 size={17} className="animate-spin" aria-hidden="true" />
      ) : (
        <Compass size={17} aria-hidden="true" />
      )}
      {detecting ? "Detecting your location…" : "Detect my location"}
    </button>
  );
}
