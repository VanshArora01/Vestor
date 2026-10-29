import { Link, Outlet, useLocation } from "react-router-dom";
import { Link2, Shield, User } from "lucide-react";
import { clsx } from "clsx";

const navigation = [
  { name: "Profile", href: "/settings/profile", icon: User },
  { name: "Financial Connections", href: "/settings/connections", icon: Link2 },
  { name: "Security", href: "/settings/security", icon: Shield },
];

export function SettingsLayout() {
  const location = useLocation();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage your account, connections, and security preferences.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col lg:flex-row lg:gap-12">
        <aside className="lg:w-64 lg:shrink-0 mb-8 lg:mb-0">
          <nav className="flex flex-col gap-1">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    isActive
                      ? "bg-slate-50 text-indigo-600"
                      : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600",
                    "group flex items-center gap-x-3 rounded-md px-3 py-2 text-sm font-medium transition"
                  )}
                >
                  <item.icon
                    className={clsx(
                      isActive
                        ? "text-indigo-600"
                        : "text-slate-400 group-hover:text-indigo-600",
                      "h-5 w-5 shrink-0 transition"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
