import { useState } from "react";
import { UserPlus, Shield, ShieldOff, KeyRound, Trash2, Power, MoreVertical } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { useUsers } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { PublicUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminUsers() {
  const { data: users, isPending } = useUsers();
  const { user: me } = useAuth();

  return (
    <AdminLayout title="Użytkownicy" description="Dodawaj graczy i zarządzaj kontami.">
      <div className="mb-4 flex justify-end">
        <AddUserDialog />
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(users ?? []).map((u) => (
            <UserRow key={u.id} user={u} isMe={u.id === me?.id} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function useInvalidateUsers() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["ranking"] });
  };
}

function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"PLAYER" | "ADMIN">("PLAYER");
  const invalidate = useInvalidateUsers();

  const create = useMutation({
    mutationFn: () => api.post<PublicUser>("/api/users", { username: username.trim(), pin, role }),
    onSuccess: () => {
      toast.success("Dodano użytkownika");
      invalidate();
      setOpen(false);
      setUsername("");
      setPin("");
      setRole("PLAYER");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = username.trim().length > 0 && /^\d{4,6}$/.test(pin);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Dodaj gracza
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowy użytkownik</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nazwa użytkownika</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="np. kuba"
              autoCapitalize="none"
            />
          </div>
          <div className="space-y-2">
            <Label>PIN (4–6 cyfr)</Label>
            <Input
              value={pin}
              inputMode="numeric"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="np. 1234"
              className="font-score tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label>Rola</Label>
            <div className="flex gap-2">
              <RoleToggle value="PLAYER" current={role} onClick={() => setRole("PLAYER")} label="Gracz" />
              <RoleToggle value="ADMIN" current={role} onClick={() => setRole("ADMIN")} label="Administrator" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={!valid || create.isPending}>
            {create.isPending ? "Dodawanie..." : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleToggle({
  value,
  current,
  onClick,
  label,
}: {
  value: string;
  current: string;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
        current === value
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-secondary/50 text-muted-foreground"
      )}
    >
      {label}
    </button>
  );
}

function UserRow({ user, isMe }: { user: PublicUser; isMe: boolean }) {
  const invalidate = useInvalidateUsers();
  const [pinOpen, setPinOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch(`/api/users/${user.id}`, body),
    onSuccess: () => {
      toast.success("Zaktualizowano");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/users/${user.id}`),
    onSuccess: () => {
      toast.success("Usunięto użytkownika");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div
      className={cn(
        "glass-card flex items-center gap-3 rounded-xl p-3",
        !user.active && "opacity-60"
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary font-display text-sm">
        {user.username.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-bold">{user.username}</span>
          {user.role === "ADMIN" ? (
            <span className="flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
              <Shield className="h-2.5 w-2.5" /> Admin
            </span>
          ) : null}
          {!user.active ? (
            <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-destructive">
              Zablokowany
            </span>
          ) : null}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {user.role === "ADMIN" ? "Administrator" : "Gracz"}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setPinOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" /> Zmień PIN
          </DropdownMenuItem>
          {user.role === "ADMIN" ? (
            <DropdownMenuItem disabled={isMe} onClick={() => patch.mutate({ role: "PLAYER" })}>
              <ShieldOff className="mr-2 h-4 w-4" /> Odbierz admina
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => patch.mutate({ role: "ADMIN" })}>
              <Shield className="mr-2 h-4 w-4" /> Nadaj admina
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={isMe}
            onClick={() => patch.mutate({ active: !user.active })}
          >
            <Power className="mr-2 h-4 w-4" />
            {user.active ? "Zablokuj" : "Odblokuj"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isMe}
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Usuń
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        onSave={(pin) => patch.mutate({ pin }, { onSuccess: () => setPinOpen(false) })}
        username={user.username}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć użytkownika {user.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Usunięte zostaną także jego typy i punkty. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => remove.mutate()}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChangePinDialog({
  open,
  onOpenChange,
  onSave,
  username,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (pin: string) => void;
  username: string;
}) {
  const [pin, setPin] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zmień PIN — {username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Nowy PIN (4–6 cyfr)</Label>
          <Input
            value={pin}
            inputMode="numeric"
            autoFocus
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="font-score tracking-widest"
          />
        </div>
        <DialogFooter>
          <Button disabled={!/^\d{4,6}$/.test(pin)} onClick={() => onSave(pin)}>
            Zapisz PIN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
