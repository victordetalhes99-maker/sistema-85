// ============================================================================
// Camada provisória de dados administrativos.
//
// Estes hooks já usam a assinatura final (AsyncState<T>) para que a UI não
// precise mudar quando as integrações reais forem ligadas. Hoje eles apenas
// devolvem estruturas vazias (ou o array estático de tatuadores que já existe
// no projeto). NADA aqui deve ser exposto ao usuário como dado real — todos
// os módulos que ainda dependem de banco/integração retornam isEmpty=true.
// ============================================================================

import { useEffect, useState } from "react";
import { TATUADORES } from "@/lib/termo";
import { useAdminClients } from "@/lib/clientes-admin";
import { useCheckInsList, todayISO } from "@/lib/checkins";
import { useRiskAlerts } from "@/lib/risk";
import type {
  Activity,
  AdminDocument,
  AsyncState,
  CheckIn,
  Client,
  ClientForm,
  Contract,
  IntegrationInfo,
  RiskAlert,
  SystemSettings,
  TattooArtist,
} from "./types";

function empty<T>(data: T): AsyncState<T> {
  return { data, isLoading: false, isEmpty: true, error: null };
}

function ready<T>(data: T, isEmpty = false): AsyncState<T> {
  return { data, isLoading: false, isEmpty, error: null };
}

// ---------------------------------------------------------------------------
// Tatuadores — único dado hoje presente no código (src/lib/termo.ts).
// Marcado como PROVISÓRIO: quando existir tabela de tatuadores no backend,
// este hook passa a consultá-la e o resto da UI continua igual.
// ---------------------------------------------------------------------------
/** @provisional — substituir por consulta real quando o backend expuser tatuadores */
export function useTatuadores(): AsyncState<TattooArtist[]> {
  const [state] = useState<AsyncState<TattooArtist[]>>(() => {
    const list: TattooArtist[] = TATUADORES.map((nome, i) => ({
      id: `static-${i}`,
      nome,
      iniciais: gerarIniciais(nome),
      status: "ativo",
      clientesHoje: null,
      atendimentosMes: null,
      ultimaAtividade: null,
    }));
    return ready(list, list.length === 0);
  });
  return state;
}

function gerarIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Todos os demais domínios abaixo aguardam integração — retornam vazio.
// A UI mostra <EmptyState /> profissional em cada caso.
// ---------------------------------------------------------------------------
export function useClientes(): AsyncState<Client[]> {
  const { data, isLoading, error } = useAdminClients();
  const mapped: Client[] = data.map((c) => ({
    id: c.cpf,
    cpf: c.cpf,
    nome: c.nome,
    telefone: c.telefone,
    email: c.email,
    tatuador: c.tatuador,
    temFicha: c.temFicha,
    temContrato: c.temAssinatura,
    risco: c.riscoNivel === "attention",
    criadoEm: c.criadoEm,
    atualizadoEm: c.atualizadoEm,
  }));
  return { data: mapped, isLoading, isEmpty: !isLoading && mapped.length === 0, error };
}

export function useCheckIns(): AsyncState<CheckIn[]> {
  const { data, isLoading, error } = useCheckInsList();
  const today = todayISO();
  const mapped: CheckIn[] = data
    .filter((c) => c.queueDay === today)
    .map((c) => ({
      id: c.id,
      clienteNome: c.clienteNome,
      cpf: c.cpf,
      tatuador: c.tatuador,
      horario: c.arrivalAt,
      status:
        c.status === "in_service"
          ? "em_atendimento"
          : c.status === "completed"
            ? "concluido"
            : "aguardando",
      temFicha: c.hasFicha,
      temContrato: c.hasAssinatura,
      risco: c.riskFlag,
    }));
  return { data: mapped, isLoading, isEmpty: !isLoading && mapped.length === 0, error };
}

export function useFichas(): AsyncState<ClientForm[]> {
  return empty<ClientForm[]>([]);
}

export function useContratos(): AsyncState<Contract[]> {
  return empty<Contract[]>([]);
}

export function useDocumentos(): AsyncState<AdminDocument[]> {
  return empty<AdminDocument[]>([]);
}

export function useAlertasRisco(): AsyncState<RiskAlert[]> {
  const { data, isLoading, error } = useRiskAlerts();
  const mapped: RiskAlert[] = data
    .filter((a) => a.status !== "archived")
    .slice(0, 8)
    .map((a) => ({
      id: a.id,
      clienteNome: a.clienteNome,
      restricoes: a.reasons.map((r) => r.label),
      criadoEm: a.detectedAt,
    }));
  return { data: mapped, isLoading, isEmpty: !isLoading && mapped.length === 0, error };
}

export function useAtividadeRecente(): AsyncState<Activity[]> {
  return empty<Activity[]>([]);
}

// ---------------------------------------------------------------------------
// Integrações — todas iniciam como "nao_configurado". Não fingir conexão.
// ---------------------------------------------------------------------------
export function useIntegracoes(): AsyncState<IntegrationInfo[]> {
  const lista: IntegrationInfo[] = [
    {
      kind: "database",
      label: "Banco de dados",
      descricao: "Persistência principal dos registros do estúdio.",
      status: "nao_configurado",
    },
    {
      kind: "google_drive",
      label: "Google Drive",
      descricao: "Armazenamento de fichas, contratos e documentos.",
      status: "nao_configurado",
    },
    {
      kind: "storage",
      label: "Armazenamento",
      descricao: "Backup de arquivos e assinaturas.",
      status: "nao_configurado",
    },
    {
      kind: "email",
      label: "E-mail transacional",
      descricao: "Confirmações, recuperação de acesso e avisos.",
      status: "nao_configurado",
    },
    {
      kind: "calendar",
      label: "Calendário",
      descricao: "Sincronização de sessões e agendamentos.",
      status: "nao_configurado",
    },
    {
      kind: "whatsapp",
      label: "WhatsApp",
      descricao: "Notificação de check-ins e mensagens ao cliente.",
      status: "nao_configurado",
    },
  ];
  return ready(lista);
}

// ---------------------------------------------------------------------------
// Configurações gerais — persistidas apenas em localStorage nesta fase.
// Sinalizado internamente para futura migração ao backend.
// ---------------------------------------------------------------------------
const SETTINGS_KEY = "ink_studio_admin_settings_v1";

export const DEFAULT_SETTINGS: SystemSettings = {
  nomeEstudio: "85 TATTOO Studio",
  nomeEmpresarial: "",
  telefone: "",
  whatsapp: "",
  email: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  horario: "",
  descricao: "",
};

/** @provisional — persistência somente local; migrar para backend quando houver integração */
export function loadSettings(): SystemSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** @provisional — persistência somente local; migrar para backend quando houver integração */
export function saveSettings(next: SystemSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
}

export function useSettings(): [SystemSettings, (next: SystemSettings) => void] {
  const [settings, setSettings] = useState<SystemSettings>(() => loadSettings());
  useEffect(() => {
    // hidrata em caso de mudança externa (outra aba)
    setSettings(loadSettings());
  }, []);
  const update = (next: SystemSettings) => {
    setSettings(next);
    saveSettings(next);
  };
  return [settings, update];
}
