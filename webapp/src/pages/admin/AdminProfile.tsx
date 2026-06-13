import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { useAuth } from "@/lib/auth";
import { useInvalidateAll } from "@/lib/queries";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminProfile() {
  const { user } = useAuth();
  const invalidateAll = useInvalidateAll();
  const [username, setUsername] = useState(user?.username ?? "");
  const [pin, setPin] = useState("");

  const update = useMutation({
    mutationFn: () =>
      api.patch("/api/auth/me", {
        username,
        pin: pin || "2026", // fallback if empty
      }),
    onSuccess: () => {
      toast.success("Profil zaktualizowany");
      setPin("");
      invalidateAll();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave =
    (username !== (user?.username ?? "") || pin !== "") && username.trim() && pin.trim();

  return (
    <AdminLayout title="Mój profil" description="Zmień nazwę użytkownika i PIN.">
      <div className="glass-card rounded-2xl p-6 max-w-md">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nazwa użytkownika</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="np. Okul"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin">Nowy PIN (4-6 cyfr)</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="np. 6655"
              maxLength={6}
            />
          </div>

          <Button
            onClick={() => update.mutate()}
            disabled={!canSave || update.isPending}
            className="w-full"
          >
            {update.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
