import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CommandPalette } from "../ui/CommandPalette";
import {
  LayoutDashboard,
  Wallet,
  Building2,
  Target,
  PieChart,
  CandlestickChart,
  GraduationCap,
  Sparkles,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  UserRound,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const MAIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/money", label: "Money", icon: Wallet },
  { to: "/accounts", label: "Accounts", icon: Building2 },
];

const INTELLIGENCE_NAV: NavItem[] = [
  { to: "/ai", label: "Vestor AI", icon: Sparkles },
];

const CONTROL_NAV: NavItem[] = [
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/invest", label: "Portfolio", icon: PieChart },
  { to: "/paper-trading", label: "Paper Trading", icon: CandlestickChart },
  { to: "/learn", label: "Learn", icon: GraduationCap },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const pageTitle = [
    ...MAIN_NAV,
    ...INTELLIGENCE_NAV,
    ...CONTROL_NAV,
  ].find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))?.label ?? "Vestor";
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notificationsOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !notificationsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setNotificationsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#EFF3F0] text-[#141C16] antialiased">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-shrink-0 flex-col justify-between overflow-y-auto border-r border-[#DCE4DF] bg-[#EFF3F0] p-6 select-none lg:w-72 md:flex">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-1">
              <NavLink to="/dashboard" className="flex items-center gap-3">
                <span className="font-sans text-xl font-bold tracking-tight text-[#141C16]">Vestor</span>
              </NavLink>
            </div>

            {/* Nav: MAIN */}
            <div className="space-y-1">
              <span className="px-3.5 text-xs font-semibold text-[#52615A]">
                Main
              </span>
              <div className="space-y-0.5 pt-1">
                {MAIN_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 font-sans text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-[#121A15] text-white shadow-md"
                            : "text-[#52615A] hover:bg-white/80 hover:text-[#141C16]"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                              isActive ? "text-[#22C55E]" : "text-[#52615A]"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Nav: INTELLIGENCE */}
            <div className="space-y-1">
              <span className="px-3.5 text-xs font-semibold text-[#52615A]">
                Intelligence
              </span>
              <div className="space-y-0.5 pt-1">
                {INTELLIGENCE_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 font-sans text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-[#121A15] text-white shadow-md"
                            : "text-[#52615A] hover:bg-white/80 hover:text-[#141C16]"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                              isActive ? "text-[#22C55E]" : "text-[#52615A]"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Nav: MONEY CONTROL */}
            <div className="space-y-1">
              <span className="px-3.5 text-xs font-semibold text-[#52615A]">
                Money Control
              </span>
              <div className="space-y-0.5 pt-1">
                {CONTROL_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 font-sans text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-[#121A15] text-white shadow-md"
                            : "text-[#52615A] hover:bg-white/80 hover:text-[#141C16]"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                              isActive ? "text-[#22C55E]" : "text-[#52615A]"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Clean Bottom Logout Action Only */}
          <div className="pt-6 border-t border-[#DCE4DF]">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 font-sans text-xs font-semibold text-[#52615A] hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <LogOut className="h-4 w-4 ml-1 text-[#52615A]" />
              <span>Log out</span>
            </button>
          </div>
      </aside>

      <div className="flex h-screen min-w-0 flex-col overflow-hidden bg-[#EFF3F0] md:ml-64 lg:ml-72">
          {location.pathname !== "/ai" && (
            <header className="z-20 flex h-[72px] flex-shrink-0 items-center justify-between border-b border-[#DCE4DF] bg-[#EFF3F0] px-5 sm:px-6 lg:px-8">
              <h1 className="font-sans text-lg font-semibold tracking-tight text-[#141C16]">{pageTitle}</h1>

              {/* Top Right Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCmdOpen(true)}
                  aria-label="Search"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#DCE4DF] text-[#52615A] hover:text-[#141C16] hover:shadow-sm transition-all"
                  title="Search or ⌘K"
                >
                  <Search className="h-4 w-4" />
                </button>

                <div className="relative" ref={notificationsRef}>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((open) => !open)}
                    aria-label="Notifications"
                    aria-haspopup="dialog"
                    aria-expanded={notificationsOpen}
                    aria-controls="notifications-menu"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DCE4DF] bg-white text-[#52615A] transition-colors hover:text-[#141C16] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 focus-visible:ring-offset-2"
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                  {notificationsOpen ? (
                    <section
                      id="notifications-menu"
                      role="dialog"
                      aria-labelledby="notifications-heading"
                      className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#DCE4DF] bg-white shadow-lg"
                    >
                      <div className="flex items-center justify-between border-b border-[#EFF3F0] px-4 py-3.5">
                        <h2 id="notifications-heading" className="text-sm font-semibold text-[#141C16]">Notifications</h2>
                        <button
                          type="button"
                          onClick={() => setNotificationsOpen(false)}
                          aria-label="Close notifications"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#52615A] transition-colors hover:bg-[#EFF3F0] hover:text-[#141C16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="px-5 py-8 text-center">
                        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF3F0] text-[#52615A]">
                          <Bell className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <p className="mt-3 text-sm font-semibold text-[#141C16]">You’re all caught up</p>
                        <p className="mx-auto mt-1 max-w-[15rem] text-xs leading-5 text-[#52615A]">New notifications will appear here.</p>
                      </div>
                    </section>
                  ) : null}
                </div>

                <div role="img" title={`Account for ${user?.name ?? "you"}`} aria-label={`Account for ${user?.name ?? "you"}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#121A15] text-[10px] font-semibold text-white sm:h-10 sm:w-10 sm:text-xs">
                  {initials || <UserRound className="h-4 w-4" />}
                </div>

                {/* Mobile menu toggle */}
                <button
                  type="button"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                  aria-expanded={mobileOpen}
                  className="md:hidden flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#DCE4DF] text-[#141C16]"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </header>
          )}

          {/* Mobile Drawer */}
          {mobileOpen && (
            <div className="md:hidden p-4 bg-white border-b border-[#DCE4DF] space-y-3 z-30">
              {[...MAIN_NAV, ...INTELLIGENCE_NAV, ...CONTROL_NAV].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 p-2.5 rounded-xl font-sans text-xs font-semibold text-[#141C16] hover:bg-[#EFF3F0]"
                >
                  <item.icon className="h-4 w-4 text-[#22C55E]" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 p-2.5 rounded-xl font-sans text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          )}

          {/* Scrollable Page Body (Only This Area Scrolls) */}
          <main
            className={`flex-1 min-w-0 ${
              location.pathname === "/ai" ? "h-full overflow-hidden p-0" : "overflow-y-auto p-5 sm:p-6 lg:p-8"
            }`}
          >
            <Outlet />
          </main>
      </div>

      {/* ⌘K Command Palette Modal */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
