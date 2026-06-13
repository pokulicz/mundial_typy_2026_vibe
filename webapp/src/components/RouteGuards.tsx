import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAdmin } = useAuth();
  if (isLoading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenSpinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
