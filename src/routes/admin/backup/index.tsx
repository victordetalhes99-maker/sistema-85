import { Link } from "react-router-dom";
import {
  Calendar,
  Cloud,
  Database,
  Download,
  Files,
  FileSignature,
  HardDrive,
  History,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/feedback/EmptyState";
import { StatusBadge } from "@/components/admin/backup/StatusBadge";
import { ProtectionChecklist } from "@/components/admin/backup/ProtectionChecklist";
import {
  useBackupAlerts,
  useBackupDestinations,
  useBackupJobs,
  useBackupOverview,
  useBackupSettings,
} from "@/lib/backup/hooks";
import {
  DESTINATION_LABELS,
  formatBytes,
  formatDateTime,
  formatDuration,
} from "@/lib/backup/format";

function MetricRow({
  icon: Icon,
  label,
  value,
  hint,
  status,
}: {
  icon: typeof Cloud;
  label: string;
  value: string;
  hint?: string;
  status?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-[color:var(--gold)]" />
        {label}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-lg font-semibold text-foreground">{value}</span>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}

export default function BackupOverviewPage() {
  const overview = useBackupOverview();
  const destinations = useBackupDestinations();
  const jobs = useBackupJobs();
  const settings = useBackupSettings();

  const alerts = useBackupAlerts(overview.data, destinations.data, jobs.data, settings.data);

  const ultimo = overview.data.ultimo_backup;
  const primeiroDestino = destinations.data.find((d) => d.status === "conectado");
  const segundoDestino = destinations.data.find(
    (d) => d.status === "conectado" && d.id !== primeiroDestino?.id,
  );

  const checklist = [
    {
      label: "Banco principal",
      done: true,
      detail: "Lovable Cloud ativo. Consultas administrativas autenticadas via RLS.",
    },
    {
      label: "Destino de armazenamento externo",
      done: destinations.data.some((d) => d.status === "conectado"),
      detail:
        destinations.data.length === 0
          ? "Nenhum destino cadastrado. Configure Cloudflare R2 ou Google Drive."
          : `${destinations.data.length} destino(s) cadastrado(s). Ao menos um precisa estar conectado.`,
      to: "/admin/backup/destinos",
    },
    {
      label: "Criptografia autenticada",
      done: !!settings.data?.encryption_enabled,
      detail: settings.data?.encryption_enabled
        ? `Ativa (${settings.data.encryption_version ?? "versão registrada"}).`
        : "Chave AES-GCM ainda não configurada — necessária para exportar dados sensíveis.",
      to: "/admin/backup/politica",
    },
    {
      label: "Agendamento automático",
      done: !!settings.data?.auto_enabled,
      detail: settings.data?.auto_enabled
        ? `${settings.data.frequency} às ${String(settings.data.hour).padStart(2, "0")}:00 (${settings.data.timezone}).`
        : "Agendamento depende da configuração do backend.",
      to: "/admin/backup/politica",
    },
    {
      label: "Teste de restauração",
      done: false,
      detail: "Restauração depende da configuração do backend e da criptografia.",
      to: "/admin/backup/restauracao",
    },
  ];

  const podeExecutar = destinations.data.some((d) => d.status === "conectado");

  return (
    <div className="space-y-6">
      {/* Aviso: dependência do backend */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100/90 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-amber-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Execução de backup
        </div>
        <p className="mt-1.5 text-xs text-amber-100/80">
          A execução automática (Google Sheets / destinos externos) roda por meio de um worker de
          servidor. Fora do ambiente Lovable esse worker precisa ser reprovisionado — nenhum backup
          é disparado a partir do navegador. Este painel continua mostrando o estado real: se não
          houver execução recente, é porque o worker está indisponível neste deploy.
        </p>
      </div>

      {/* Estado geral */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/60 to-card/30 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--gold)]" />
              Proteção dos dados
            </div>
            <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
              {alerts.some((a) => a.severity === "critico")
                ? "Proteção ainda não configurada"
                : podeExecutar
                  ? "Proteção operacional"
                  : "Configuração em andamento"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Nenhum dado fictício é exibido: destinos, execuções e agendamento refletem exatamente
              o estado do backend.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="btn-gold"
              disabled
              title="Aguardando worker/edge function de execução de backup"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Executar backup manual
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/backup/destinos">
                <HardDrive className="mr-1.5 h-4 w-4" />
                Configurar destino
              </Link>
            </Button>
          </div>
        </div>
        {!podeExecutar && (
          <p className="mt-3 text-[11px] text-muted-foreground/80">
            Execução manual dependerá de um destino conectado e do worker de backup no backend. Nada
            é executado a partir do navegador.
          </p>
        )}
      </div>

      {/* Checklist da proteção */}
      <ProtectionChecklist items={checklist} />

      {/* Cards principais */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricRow
          icon={History}
          label="Último backup"
          value={ultimo ? formatDateTime(ultimo.started_at) : "—"}
          hint={
            ultimo
              ? `${ultimo.type} · ${formatBytes(ultimo.size_bytes)} · ${formatDuration(ultimo.duration_ms)}`
              : "Nenhum backup executado"
          }
          status={ultimo?.status}
        />
        <MetricRow
          icon={Calendar}
          label="Próximo backup"
          value={
            settings.data?.auto_enabled
              ? `${settings.data.frequency} · ${String(settings.data.hour).padStart(2, "0")}:00`
              : "—"
          }
          hint={settings.data?.auto_enabled ? settings.data.timezone : "Agendamento não ativado"}
        />
        <MetricRow
          icon={Cloud}
          label="Destino principal"
          value={primeiroDestino ? DESTINATION_LABELS[primeiroDestino.kind] : "—"}
          hint={primeiroDestino ? primeiroDestino.label : "Nenhum destino ativo"}
          status={primeiroDestino?.status ?? "nao_configurado"}
        />
        <MetricRow
          icon={Cloud}
          label="Destino secundário"
          value={segundoDestino ? DESTINATION_LABELS[segundoDestino.kind] : "—"}
          hint={segundoDestino ? segundoDestino.label : "Opcional para redundância"}
          status={segundoDestino?.status ?? "nao_configurado"}
        />
        <MetricRow
          icon={Lock}
          label="Integridade"
          value={ultimo?.checksum_sha256 ? "Hash registrado" : "—"}
          hint={
            ultimo?.checksum_sha256
              ? `${ultimo.checksum_sha256.slice(0, 12)}…`
              : "Nenhuma validação realizada"
          }
          status={
            ultimo ? (ultimo.status === "completed" ? "conectado" : ultimo.status) : undefined
          }
        />
      </div>

      {/* Proteção por conteúdo */}
      <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <Database className="h-3.5 w-3.5 text-[color:var(--gold)]" />
          Cobertura da proteção
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Database, label: "Banco de dados" },
            { icon: Files, label: "Documentos e PDFs" },
            { icon: FileSignature, label: "Assinaturas" },
            { icon: Download, label: "Configurações" },
          ].map((c) => {
            const inclui = settings.data?.content?.[c.label] ?? true;
            return (
              <div
                key={c.label}
                className="rounded-lg border border-border/50 bg-background/30 p-3"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <c.icon className="h-3.5 w-3.5" />
                  {c.label}
                </div>
                <div className="mt-2 text-sm text-foreground">
                  {inclui ? "Incluído" : "Excluído"}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground/70">
                  {ultimo ? "presente no último pacote" : "aguardando primeira execução"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alertas ativos */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Alertas ativos
          </div>
          <ul className="mt-3 space-y-2">
            {alerts.slice(0, 4).map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/30 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={
                        a.severity === "critico"
                          ? "failed"
                          : a.severity === "atencao"
                            ? "partial"
                            : "queued"
                      }
                      label={
                        a.severity === "critico"
                          ? "Crítico"
                          : a.severity === "atencao"
                            ? "Atenção"
                            : "Info"
                      }
                    />
                    <span className="text-sm font-medium text-foreground">{a.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                </div>
                {a.action && (
                  <Button asChild size="sm" variant="outline">
                    <Link to={a.action.to}>{a.action.label}</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {overview.error && (
        <EmptyState
          icon={ShieldCheck}
          title="Não foi possível carregar o estado da proteção"
          description="Verifique se você está autenticado como administrador. Nenhum dado é exibido em modo de fallback."
        />
      )}
    </div>
  );
}
