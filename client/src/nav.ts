import { Home, Radio, Heart, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
  live: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: Home, end: true, live: false },
  { to: "/stations", label: "Local FM", icon: Radio, end: false, live: false },
  { to: "/live", label: "Live", icon: Radio, end: false, live: true },
  { to: "/favorites", label: "Favorites", icon: Heart, end: false, live: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false, live: false },
];
