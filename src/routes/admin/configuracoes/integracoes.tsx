import { AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/admin/feedback/EmptyState";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { useIntegracoes } from "@/lib/admin-data/hooks";

const STATUS_LABEL: Record<string, string> = {
  nao_configurado: "Nao configurado",
  pendente: "Configuracao incompleta",
  conectado: "Conectado",
  erro: "Erro",
  desativado: "Desativado",
};

export default function ConfigIntegracoesPage() {
  const { data, isLoading, error } = useIntegracoes();

  return (
    <SettingsSection
      title="Integracoes"
      description="Cards refletem o estado real do backend. Configuracao e teste exigem credenciais aprovadas - nenhum segredo e digitado ou armazenado no navegador."
    >
      {error && (
        <EmptyState
          icon={AlertCircle}
          title="Nao foi possivel carregar as integracoes"
          description="O painel nao conseguiu validar o estado atual do backend neste navegador."
        />
      )}

      {!error && isLoading && (
        <div className="rounded-lg border border-border/50 bg-background/30 p-4 text-sm text-muted-foreground">
          Validando banco, storage e destinos reais do backend...
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.map((i) => (
          <div
            key={i.kind}
            className="flex flex-col gap-3 rounded-lg border border-border/50 bg-background/30 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{i.label}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{i.descricao}</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-md border border-border/60 bg-card/60 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <AlertCircle className="h-3 w-3" /> {STATUS_LABEL[i.status]}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled
                title="Fluxo seguro de configuracao ainda nao disponivel"
              >
                Configurar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled
                title="Aguardando fluxo de teste autenticado no backend"
              >
                Testar conexao
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {i.statusDetail ?? "Sem detalhe adicional."}
            </p>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
