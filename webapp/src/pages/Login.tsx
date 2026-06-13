import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Goal, LogIn } from "lucide-react";
import { useLogin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const navigate = useNavigate();
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4,6}$/.test(pin)) {
      setError("PIN musi mieć od 4 do 6 cyfr.");
      return;
    }
    login.mutate(
      { username: username.trim(), pin },
      {
        onSuccess: () => navigate("/"),
        onError: (err: Error) => setError(err.message || "Nie udało się zalogować"),
      }
    );
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* pitch lines backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/30">
            <Goal className="h-9 w-9" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-3xl tracking-tight">MUNDIAL TYPY</h1>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            2026
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Zaloguj się, aby typować wyniki meczów.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-card sheen space-y-4 rounded-2xl p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="username">Nazwa użytkownika</Label>
            <Input
              id="username"
              autoFocus
              autoCapitalize="none"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="np. kuba"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••"
              className="h-12 font-score text-lg tracking-[0.4em]"
            />
          </div>

          {error ? (
            <div className="rounded-lg bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full text-base font-bold"
            disabled={login.isPending || !username || !pin}
          >
            <LogIn className="mr-2 h-4 w-4" />
            {login.isPending ? "Logowanie..." : "Zaloguj się"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Nie masz konta? Poproś administratora ligi o dodanie Cię.
        </p>
      </div>
    </div>
  );
}
