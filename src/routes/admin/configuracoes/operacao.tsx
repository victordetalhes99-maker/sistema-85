import { Info } from "lucide-react";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const CAMPOS = [
  "Horário de atendimento",
  "Duração padrão da sessão",
  "Tolerância de atraso (min)",
  "Limite diário de atendimentos",
  "Ordem da fila",
  "Regras de check-in",
];

export default function ConfigOperacaoPage() {
  return (
    <SettingsSection
      title="Operação do estúdio"
      description="Regras de atendimento, fila e recepção. As regras de check-in reais vivem em /admin/checkins; esta aba receberá persistência quando o backend operacional for aprovado."
    >
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300/90">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          <strong>Aguardando backend operacional.</strong> Os campos abaixo estão desabilitados
          porque ainda não há tabela nem RPC dedicadas. Nada é persistido nesta aba — as regras
          reais de check-in seguem em <code>/admin/checkins</code>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CAMPOS.map((label) => (
          <div key={label}>
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            <Input className="mt-1.5" placeholder="—" disabled />
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
