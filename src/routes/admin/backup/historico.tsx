import { Link } from "react-router-dom";
import { History, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/feedback/EmptyState";
import { StatusBadge } from "@/components/admin/backup/StatusBadge";
import { useBackupDestinations, useBackupJobs } from "@/lib/backup/hooks";
import {
  DESTINATION_LABELS,
  formatBytes,
  formatDateTime,
  formatDuration,
  STATUS_LABELS,
} from "@/lib/backup/format";

export default function BackupHistoricoPage() {
  const { data: jobs, isLoading, error } = useBackupJobs();
  const { data: destinations } = useBackupDestinations();
  const podeExecutar = destinations.some((d) => d.status === "conectado");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Toda execução registrada é auditável, com hash e responsável. Nenhuma linha fictícia.
        </p>
        <Button
          className="btn-gold"
          disabled
          title={
            podeExecutar
              ? "Aguardando worker/edge function de execução de backup"
              : "Configure um destino conectado antes de habilitar a execução"
          }
        >
          <Play className="mr-1.5 h-4 w-4" />
          Executar backup manual
        </Button>
      </div>

      {error && (
        <EmptyState
          icon={History}
          title="Histórico indisponível"
          description="Autentique-se como administrador para visualizar as execuções."
        />
      )}

      {!error && !isLoading && jobs.length === 0 && (
        <EmptyState
          icon={History}
          title="Nenhum backup foi executado"
          description="Configure um destino e execute a primeira cópia de segurança para começar o histórico."
          action={
            <Button asChild variant="outline">
              <Link to="/admin/backup/destinos">Configurar destino</Link>
            </Button>
          }
        />
      )}

      {jobs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border/40 bg-background/40 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Destino</th>
                <th className="px-4 py-2.5">Tamanho</th>
                <th className="px-4 py-2.5">Duração</th>
                <th className="px-4 py-2.5">Integridade</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-background/30">
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(j.started_at)}
                  </td>
                  <td className="px-4 py-3 text-foreground">{STATUS_LABELS[j.type] ?? j.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {j.destination_kind ? DESTINATION_LABELS[j.destination_kind] : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatBytes(j.size_bytes)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDuration(j.duration_ms)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {j.checksum_sha256 ? `${j.checksum_sha256.slice(0, 10)}…` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/backup/historico/${j.id}`}
                      className="text-xs font-medium text-[color:var(--gold)] hover:underline"
                    >
                      Detalhes →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
