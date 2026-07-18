import { Info, ShieldCheck } from "lucide-react";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { useAuth } from "@/lib/auth/AuthProvider";

function useMe() {
  const { email, userId, isAdmin, authLoading, adminLoading } = useAuth();
  return {
    email,
    userId,
    isAdmin,
    loading: authLoading || adminLoading,
  };
}

export default function ConfigAdministradorPage() {
  const me = useMe();

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Sua conta administrativa"
        description="Perfil do administrador autenticado. Alterações de perfil e convites de outros administradores exigem backend administrativo dedicado (não incluído nesta fase)."
      >
        {me.loading ? (
          <p className="text-xs text-muted-foreground">Carregando sessão…</p>
        ) : !me.userId ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300/90">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>Sem sessão administrativa. Faça login para ver seus dados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info2 label="E-mail" value={me.email ?? "—"} />
            <Info2 label="ID interno" value={me.userId} mono />
            <Info2
              label="Função"
              value={me.isAdmin ? "Administrador" : "Sem privilégios administrativos"}
              tone={me.isAdmin ? "success" : "warning"}
            />
            <Info2 label="Fonte" value="Supabase Auth + public.has_role(user_id, 'admin')" />
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Convidar / gerenciar administradores"
        description="Adicionar, revogar ou alterar função de administradores exige backend administrativo protegido — ainda não disponível."
      >
        <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-background/30 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--gold)]" />
          <div>
            <p>
              <strong className="text-foreground">Aguardando backend.</strong> Convites e revogação
              serão feitos via edge function protegida por <code>is_admin()</code>. Enquanto isso, a
              inclusão de administradores ocorre pelo painel do banco (backend interno) — o sistema
              nunca cria administradores fictícios aqui.
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function Info2({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "success" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={[
          "mt-1 text-sm",
          mono ? "font-mono text-xs" : "font-medium",
          tone === "success"
            ? "text-emerald-300"
            : tone === "warning"
              ? "text-amber-300"
              : "text-foreground",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
