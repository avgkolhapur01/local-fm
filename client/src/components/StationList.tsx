import type { ReactNode } from "react";
import { Radio } from "lucide-react";
import type { RadioStation } from "../types/radio";
import StationCard from "./StationCard";
import EmptyState from "./EmptyState";

interface StationListProps {
  stations: RadioStation[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}

function StationSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-card bg-card p-3">
      <div className="h-12 w-12 shrink-0 animate-pulseSoft rounded-2xl bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-16 animate-pulseSoft rounded bg-white/5" />
        <div className="h-3 w-32 animate-pulseSoft rounded bg-white/5" />
        <div className="h-2.5 w-24 animate-pulseSoft rounded bg-white/5" />
      </div>
      <div className="h-10 w-10 shrink-0 animate-pulseSoft rounded-full bg-white/5" />
    </div>
  );
}

export default function StationList({
  stations,
  loading,
  emptyTitle = "No stations found",
  emptyDescription = "We couldn't find an FM station for this location.",
  emptyAction,
}: StationListProps) {
  if (loading) {
    return (
      <div className="space-y-2.5" aria-busy="true" aria-label="Loading stations">
        {Array.from({ length: 5 }).map((_, i) => (
          <StationSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (stations.length === 0) {
    return <EmptyState icon={Radio} title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="space-y-2.5">
      {stations.map((station) => (
        <StationCard key={station.id} station={station} />
      ))}
    </div>
  );
}
