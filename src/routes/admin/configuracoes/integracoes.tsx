import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { useIntegracoes } from "@/lib/admin-data/hooks";

const STATUS_LABEL: Record<string, string> = {
  nao_configurado: "Não configurado",
  pendente: "Configuração incompleta",
  conectado: "Conectado",
  erro: "Erro",
  desativado: "Desativado",
};

export default function ConfigIntegracoesPage() {
  const { data } = useIntegracoes();

  return (
    <SettingsSection
      title="Integrações"
      description="Cards refletem o estado real do backend. Configuração e teste exigem credenciais aprovadas — nenhum segredo é digitado ou armazenado no navegador."
    >
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
                title="Fluxo seguro de configuração ainda não disponível"
              >
                Configurar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled
                title="Aguardando fluxo de teste no backend"
              >
                Testar conexão
              </Button>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-amber-300/70">
              Aguardando backend seguro para credenciais
            </p>
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
