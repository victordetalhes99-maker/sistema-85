import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";

export default function ConfigBackupPage() {
  return (
    <SettingsSection
      title="Backup"
      description="Configuração da rotina de backup do sistema."
      footer={
        <Button asChild className="btn-gold">
          <Link to="/admin/backup">Abrir central de backup</Link>
        </Button>
      }
    >
      <div className="rounded-lg border border-border/50 bg-background/30 p-4 text-sm text-muted-foreground">
        Backup não configurado. Para proteger os dados, vincule um destino de armazenamento na aba
        de integrações.
      </div>
    </SettingsSection>
  );
}
