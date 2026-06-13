import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Trophy, ListChecks, Shield, LogOut, Goal } from "lucide-react";
import { useAuth, useLogout } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Mecze", icon: CalendarDays, exact: true },
  { to: "/ranking", label: "Ranking", icon: Trophy, exact: false },
  { to: "/moje-typy", label: "Moje typy", icon: ListChecks, exact: false },
];

function isActive(pathname: string, to: string, exact: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(to + "/");
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const logout = useLogout();

  const items = isAdmin
    ? [...navItems, { to: "/admin", label: "Panel", icon: Shield, exact: false }]
    : navItems;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Goal className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <div className="font-display text-base tracking-tight">MUNDIAL TYPY</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">2026</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => {
              const active = isActive(location.pathname, item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold leading-none">{user?.username}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {isAdmin ? "Administrator" : "Gracz"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout.mutate()}
              title="Wyloguj"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-background/90 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around">
          {items.map((item) => {
            const active = isActive(location.pathname, item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors min-h-[56px] justify-center",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
