import { Info } from "lucide-react";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";

const ITENS = [
  { t: "Modelo de ficha", d: "Anamnese e prontuário do cliente." },
  { t: "Modelo de contrato", d: "Contrato de execução de serviço." },
  { t: "Termo de consentimento", d: "LGPD e ciência de riscos." },
  { t: "Assinatura", d: "Padrão de assinatura visual." },
  { t: "Dados do estúdio nos PDFs", d: "Cabeçalhos e rodapé dos documentos." },
  { t: "Formato e nomenclatura", d: "Padrão de nome e formato dos arquivos." },
];

export default function ConfigDocumentosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300/90">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          <strong>Modelos vivem no código, com versionamento por hash.</strong> Consulte
          <code className="mx-1 rounded bg-background/40 px-1">src/lib/contratos/templates.ts</code>
          para o termo vigente. A edição visual de templates exige backend dedicado — nada é
          alterado a partir desta tela.
        </p>
      </div>

      <SettingsSection
        title="Modelos e nomenclatura"
        description="Estado atual dos modelos aplicados a PDFs gerados pelo sistema."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ITENS.map((c) => (
            <div
              key={c.t}
              className="rounded-lg border border-dashed border-border/50 bg-background/30 p-4"
            >
              <div className="text-sm font-medium">{c.t}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.d}</p>
              <div className="mt-3 text-[10px] uppercase tracking-wider text-amber-300/80">
                Somente leitura — aguardando editor
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
