import { Link, useLocation } from "react-router-dom";
import { Users, CalendarCog, ClipboardList, Trophy, Settings } from "lucide-react";
import { Layout } from "./Layout";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin/uzytkownicy", label: "Użytkownicy", icon: Users },
  { to: "/admin/mecze", label: "Mecze", icon: CalendarCog },
  { to: "/admin/typy", label: "Typy", icon: ClipboardList },
  { to: "/admin/ranking", label: "Ranking", icon: Trophy },
  { to: "/admin/profil", label: "Mój profil", icon: Settings },
];

export function AdminLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const active = (to: string) =>
    location.pathname === to || (to === "/admin/uzytkownicy" && location.pathname === "/admin");

  return (
    <Layout>
      <div className="mb-5">
        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Panel administratora
        </div>
        <h1 className="font-display text-2xl tracking-tight md:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
              active(t.to)
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        ))}
      </div>

      {children}
    </Layout>
  );
}
