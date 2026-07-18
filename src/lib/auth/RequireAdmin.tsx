import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background/60 p-6 text-center backdrop-blur">
        {children}
      </div>
    </div>
  );
}

export default function RequireAdmin() {
  const { status, isAdmin, adminLoading, email, signOut } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <FullScreen>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[color:var(--gold)]" />
        <p className="mt-3 text-sm text-muted-foreground">Verificando sessão…</p>
      </FullScreen>
    );
  }

  if (status === "unauthenticated") {
    const next = location.pathname + location.search;
    return <Navigate to={`/admin-login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (adminLoading) {
    return (
      <FullScreen>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[color:var(--gold)]" />
        <p className="mt-3 text-sm text-muted-foreground">Carregando permissões…</p>
      </FullScreen>
    );
  }

  if (!isAdmin) {
    return (
      <FullScreen>
        <ShieldAlert className="mx-auto h-8 w-8 text-amber-400" />
        <h1 className="mt-3 text-lg font-semibold text-foreground">Acesso negado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A conta <span className="font-mono">{email}</span> não possui permissão administrativa.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Peça a um administrador para conceder acesso ou entre com outra conta.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await signOut();
            }}
          >
            Sair
          </Button>
        </div>
      </FullScreen>
    );
  }

  return <Outlet />;
}
