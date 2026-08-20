import { Heart } from "lucide-react";

interface FavoriteButtonProps {
  active: boolean;
  onToggle: () => void;
  size?: number;
  className?: string;
}

export default function FavoriteButton({ active, onToggle, size = 18, className = "" }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      className={`grid place-items-center rounded-full p-2 transition-colors ${
        active ? "text-accent" : "text-text-secondary hover:text-text-primary"
      } ${className}`}
    >
      <Heart size={size} fill={active ? "currentColor" : "none"} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
