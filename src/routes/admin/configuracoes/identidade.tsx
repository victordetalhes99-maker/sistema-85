import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";

export default function ConfigIdentidadePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300/90">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          <strong>Requer bucket público de identidade.</strong> Hoje apenas o bucket privado
          <code className="mx-1 rounded bg-background/40 px-1">assinaturas</code> existe. Uploads de
          logo, ícone e assinatura visual serão liberados quando um bucket
          <code className="mx-1 rounded bg-background/40 px-1">branding</code> for aprovado. Nada é
          enviado a partir desta tela.
        </p>
      </div>

      <SettingsSection
        title="Identidade visual"
        description="Logotipo, ícone e paleta que representam o estúdio nas interfaces e documentos. A paleta atual (preto / grafite / dourado) é fixa até a personalização por template ser publicada."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <IdentityCard
            title="Logotipo"
            hint="Formato recomendado: PNG ou SVG com fundo transparente."
          />
          <IdentityCard title="Ícone" hint="Favicon e ícones do sistema. 512x512." />
          <IdentityCard
            title="Assinatura visual dos documentos"
            hint="Linha decorativa aplicada em fichas e contratos."
          />
          <IdentityCard title="Imagem de fundo" hint="Imagem sutil exibida no fundo do painel." />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Paleta"
        description="Cores atuais do painel — somente leitura nesta fase."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { name: "Preto profundo", value: "#0A0A0A" },
            { name: "Grafite", value: "#151515" },
            { name: "Dourado", value: "#C8A951" },
            { name: "Branco", value: "#F5F5F5" },
          ].map((c) => (
            <div key={c.name} className="rounded-lg border border-border/50 bg-background/30 p-3">
              <div className="h-10 rounded" style={{ backgroundColor: c.value }} aria-hidden />
              <div className="mt-2 text-[11px] font-medium text-foreground">{c.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {c.value}
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}

function IdentityCard({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-5">
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-2 text-[10px] uppercase tracking-wider text-amber-300/80">
        Aguardando bucket de identidade
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled
          title="Bucket público de identidade ainda não configurado"
        >
          Enviar
        </Button>
        <Button variant="ghost" size="sm" disabled>
          Remover
        </Button>
      </div>
    </div>
  );
}
