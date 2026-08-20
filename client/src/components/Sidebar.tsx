import { NavLink } from "react-router-dom";
import { History } from "lucide-react";
import { NAV_ITEMS } from "../nav";

// Desktop-only vertical icon rail. Mirrors the same routes as the mobile
// bottom nav (imported from the shared NAV_ITEMS list) plus a shortcut to
// the Recently Played section, which lives on the Favorites page.
export default function Sidebar() {
  return (
    <aside
      className="fixed bottom-24 left-0 top-24 z-30 hidden w-24 flex-col items-center gap-1 py-6 lg:flex"
      aria-label="Secondary"
    >
      {NAV_ITEMS.filter((item) => item.to !== "/settings").map(({ to, label, icon: Icon, end, live }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex w-16 flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] font-medium transition-colors ${
              isActive
                ? live
                  ? "text-error"
                  : "text-accent-secondary"
                : "text-text-secondary hover:text-text-primary"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.3 : 1.8} aria-hidden="true" />
                {live && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-error" />}
              </span>
              <span className="text-center leading-tight">{label}</span>
            </>
          )}
        </NavLink>
      ))}

      <NavLink
        to="/favorites"
        className={({ isActive }) =>
          `flex w-16 flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] font-medium transition-colors ${
            isActive ? "text-accent-secondary" : "text-text-secondary hover:text-text-primary"
          }`
        }
      >
        <History size={22} strokeWidth={1.8} aria-hidden="true" />
        <span className="text-center leading-tight">Recently Played</span>
      </NavLink>
    </aside>
  );
}
