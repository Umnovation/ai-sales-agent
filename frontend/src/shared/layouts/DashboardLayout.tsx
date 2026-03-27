import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  GitBranch,
  MessageSquare,
  Settings,
} from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";

interface NavItem {
  readonly path: string;
  readonly icon: React.ReactNode;
  readonly label: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { path: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
  { path: "/flow", icon: <GitBranch size={20} />, label: "Flow Editor" },
  { path: "/chats", icon: <MessageSquare size={20} />, label: "Chats" },
  { path: "/settings", icon: <Settings size={20} />, label: "Settings" },
] as const;

export function DashboardLayout(): React.ReactElement {
  const { logout } = useAuth();

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar — 56px, dark, icons only */}
      <aside className="flex h-full w-14 flex-col items-center bg-[var(--app-sidebar-bg)]">
        {/* Logo */}
        <div className="flex h-16 w-full items-center justify-center pt-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-primary)] text-sm font-bold text-white">
            S
          </div>
        </div>

        {/* Separator */}
        <div className="mx-3 my-0 h-px w-8 bg-[#1E293B]" />

        {/* Navigation */}
        <nav className="flex flex-col items-center gap-1 py-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `group relative flex h-11 w-14 items-center justify-center transition-colors duration-150 ${
                  isActive
                    ? "text-[var(--app-sidebar-icon-active)]"
                    : "text-[var(--app-sidebar-icon)] hover:text-[var(--app-sidebar-icon-active)]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator — left accent bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--app-accent-left)]" />
                  )}
                  {item.icon}
                  {/* Tooltip */}
                  <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-md bg-[#1E293B] px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom: user avatar */}
        <div className="flex flex-col items-center gap-3 pb-4">
          <div className="mx-3 h-px w-8 bg-[#1E293B]" />
          <button
            onClick={logout}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E293B] text-xs font-medium text-[var(--app-sidebar-icon)] transition-colors hover:text-white"
            title="Logout"
          >
            v
          </button>
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 overflow-auto bg-[var(--app-bg-page)]">
        <Outlet />
      </main>
    </div>
  );
}
