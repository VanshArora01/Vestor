import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/money", label: "Money" },
  { to: "/accounts", label: "Accounts" },
  { to: "/goals", label: "Goals" },
  { to: "/invest", label: "Portfolio" },
  { to: "/learn", label: "Learn" },
  { to: "/market", label: "Market" },
  { to: "/ai", label: "Vestor AI" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <NavLink to="/dashboard" className="font-display text-xl font-semibold tracking-tight text-ink-950">
            Vestor
          </NavLink>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? "bg-accent-soft text-accent" : "text-ink-700 hover:bg-ink-100"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-500 sm:inline">{user?.name}</span>
          <Button variant="secondary" type="button" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
