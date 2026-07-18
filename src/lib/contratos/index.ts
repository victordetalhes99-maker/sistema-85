// ============================================================================
// Fonte única do módulo de Contratos — 85 TATTOO
// ----------------------------------------------------------------------------
// Um "contrato" é derivado da tabela `consent_records` (tipo = 'termo') unida
// à tabela `clientes` (dados) e ao array `clientes.sessoes` (assinatura +
// tatuador da sessão). Nenhum outro arquivo deve montar contratos por conta
// própria — todas as telas (listagem, detalhe, relatório, dashboard, ficha,
// documentos, check-in) consomem os hooks/funções deste módulo.
//
// Modelo:
//   • ID           = `consent_records.id`      (UUID estável)
//   • Cliente      = vinculado pelo CPF real (identidade estável do projeto)
//   • Tatuador     = do snapshot da sessão correspondente (fallback cadastro)
//   • Ficha        = mesma sessão → id composto "<cpf>:v0" | "<cpf>:s<idx>"
//   • Assinatura   = caminho no bucket privado `assinaturas`
//   • Template     = ver `templates.ts` (versionado)
//   • Aceite/hash  = `consent_records.texto_hash` (SHA-256 do texto exibido)
//
// Contratos são imutáveis por construção: `consent_records` não é editado.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type Cliente, type Sessao, onlyDigits, rowToCliente } from "@/lib/clientes";
import { CONTRACT_TEMPLATES, getContractTemplate } from "./templates";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ContratoStatus = "signed" | "cancelled" | "superseded" | "error";

export interface ContratoSnapshotCliente {
  cpf: string;
  cpfMasked: string;
  nomeCompleto: string;
  iniciais: string;
  documento: string; // CPF formatado (uso interno; UI mostra sempre mascarado)
  dataNascimento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
}

export interface ContratoSnapshotTatuador {
  id: string; // slug estável derivado do nome (mesma origem dos relatórios)
  displayName: string;
}

export interface ContratoResumo {
  id: string;
  cpf: string;
  cpfMasked: string;
  clienteNome: string;
  clienteIniciais: string;
  tatuador: string | null;
  tatuadorId: string | null;
  templateId: string;
  versao: string;
  status: ContratoStatus;
  aceitoEm: string; // ISO — igual a signedAt no fluxo atual
  assinadoEm: string | null; // ISO
  temAssinatura: boolean;
  temPdf: boolean; // gerável on-demand quando há assinatura
  fichaId: string | null;
  origem: "primeira_visita" | "recorrente";
  atualizadoEm: string;
}

export interface ContratoDetalhe extends ContratoResumo {
  cliente: ContratoSnapshotCliente;
  tatuadorSnapshot: ContratoSnapshotTatuador | null;
  assinaturaPath: string | null;
  textoHash: string | null; // hash SHA-256 do texto aceito (do consent_records)
  hashAlgoritmo: "SHA-256";
  aceite: {
    userAgent: string | null;
    ip: string | null;
    device: Record<string, unknown> | null;
    versao: string;
  };
  historico: ContratoEvento[];
  outrosContratos: Array<Pick<ContratoResumo, "id" | "versao" | "aceitoEm" | "status">>;
}

export type ContratoEventoTipo =
  "created" | "reviewed" | "terms_accepted" | "signature_registered" | "signed" | "pdf_generated";

export interface ContratoEvento {
  tipo: ContratoEventoTipo;
  em: string;
  detalhes?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iniciais(nome: string): string {
  const p = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "—";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export function maskCpfSafe(cpf: string): string {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.***-${d.slice(9, 11)}`;
}

export function formatCpfFull(cpf: string): string {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function tatuadorSlug(nome: string): string {
  return (nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Row do consent_records
// ---------------------------------------------------------------------------

interface ConsentRow {
  id: string;
  cpf: string;
  tipo: "lgpd" | "termo" | "anamnese" | string;
  versao: string;
  texto_hash: string;
  ip: string | null;
  user_agent: string | null;
  device: Record<string, unknown> | null;
  criado_em: string;
}

// ---------------------------------------------------------------------------
// Emparelhamento consent ↔ sessão do cliente
// ---------------------------------------------------------------------------

interface MatchedSession {
  fichaId: string;
  origem: "primeira_visita" | "recorrente";
  tatuador: string | null;
  assinaturaPath: string | null;
  data: string;
}

function matchSessao(cliente: Cliente, consentIso: string): MatchedSession {
  const cpf = onlyDigits(cliente.cpf);
  const sessoes: Sessao[] = cliente.sessoes || [];
  const consentTs = new Date(consentIso).getTime();

  // Melhor sessão = menor distância temporal
  let bestIdx = -1;
  let bestDist = Infinity;
  sessoes.forEach((s, idx) => {
    const t = new Date(s.data || "").getTime();
    if (!Number.isFinite(t)) return;
    const dist = Math.abs(t - consentTs);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = idx;
    }
  });

  // Emparelhar apenas quando a diferença for < 24h — caso contrário caímos
  // no snapshot da primeira visita (cadastro base do cliente).
  const withinDay = bestIdx >= 0 && bestDist <= 24 * 3600 * 1000;
  if (withinDay) {
    const s = sessoes[bestIdx];
    // Primeira sessão registrada é a "primeira visita" (v0); demais são recorrentes.
    if (bestIdx === 0) {
      return {
        fichaId: `${cpf}:v0`,
        origem: "primeira_visita",
        tatuador: s.tatuador || cliente.dadosCadastrais?.tatuador || null,
        assinaturaPath: s.assinatura || cliente.assinatura || null,
        data: s.data || cliente.criadoEm,
      };
    }
    return {
      fichaId: `${cpf}:s${bestIdx}`,
      origem: "recorrente",
      tatuador: s.tatuador || cliente.dadosCadastrais?.tatuador || null,
      assinaturaPath: s.assinatura || null,
      data: s.data || cliente.atualizadoEm,
    };
  }

  return {
    fichaId: `${cpf}:v0`,
    origem: "primeira_visita",
    tatuador: cliente.dadosCadastrais?.tatuador || null,
    assinaturaPath: cliente.assinatura || null,
    data: cliente.criadoEm,
  };
}

// ---------------------------------------------------------------------------
// Repositório
// ---------------------------------------------------------------------------

async function fetchConsentTermos(): Promise<ConsentRow[]> {
  const { data, error } = await supabase
    .from("consent_records")
    .select("*")
    .eq("tipo", "termo")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConsentRow[];
}

async function fetchClientesByCpfs(cpfs: string[]): Promise<Map<string, Cliente>> {
  const uniq = Array.from(new Set(cpfs.map(onlyDigits))).filter((c) => c.length === 11);
  if (uniq.length === 0) return new Map();
  const { data, error } = await supabase.from("clientes").select("*").in("cpf", uniq);
  if (error) throw error;
  const map = new Map<string, Cliente>();
  (data ?? []).forEach((r) => {
    const c = rowToCliente(r as never);
    map.set(onlyDigits(c.cpf), c);
  });
  return map;
}

async function fetchClienteByCpf(cpf: string): Promise<Cliente | null> {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return null;
  const { data, error } = await supabase.from("clientes").select("*").eq("cpf", d).maybeSingle();
  if (error) throw error;
  return data ? rowToCliente(data as never) : null;
}

async function fetchConsentTermosByCpf(cpf: string): Promise<ConsentRow[]> {
  const d = onlyDigits(cpf);
  const { data, error } = await supabase
    .from("consent_records")
    .select("*")
    .eq("tipo", "termo")
    .eq("cpf", d)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConsentRow[];
}

// ---------------------------------------------------------------------------
// Montagem do contrato
// ---------------------------------------------------------------------------

function buildResumo(row: ConsentRow, cliente: Cliente | undefined): ContratoResumo {
  const cpf = onlyDigits(row.cpf);
  const nome = cliente?.dadosCadastrais?.nomeCompleto || "";
  if (!cliente) {
    // Contrato órfão: consent existe mas cliente foi anonimizado/excluído.
    return {
      id: row.id,
      cpf,
      cpfMasked: maskCpfSafe(cpf),
      clienteNome: "Titular removido",
      clienteIniciais: "—",
      tatuador: null,
      tatuadorId: null,
      templateId: getContractTemplate(row.versao).id,
      versao: row.versao,
      status: "signed",
      aceitoEm: row.criado_em,
      assinadoEm: row.criado_em,
      temAssinatura: false,
      temPdf: false,
      fichaId: null,
      origem: "primeira_visita",
      atualizadoEm: row.criado_em,
    };
  }
  const match = matchSessao(cliente, row.criado_em);
  const temAssinatura = Boolean(match.assinaturaPath);
  return {
    id: row.id,
    cpf,
    cpfMasked: maskCpfSafe(cpf),
    clienteNome: nome,
    clienteIniciais: iniciais(nome),
    tatuador: match.tatuador,
    tatuadorId: match.tatuador ? tatuadorSlug(match.tatuador) : null,
    templateId: getContractTemplate(row.versao).id,
    versao: row.versao,
    status: "signed",
    aceitoEm: row.criado_em,
    assinadoEm: temAssinatura ? row.criado_em : null,
    temAssinatura,
    temPdf: temAssinatura,
    fichaId: match.fichaId,
    origem: match.origem,
    atualizadoEm: row.criado_em,
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface AsyncList<T> {
  data: T[];
  isLoading: boolean;
  isEmpty: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useContratos(): AsyncList<ContratoResumo> {
  const [data, setData] = useState<ContratoResumo[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const rows = await fetchConsentTermos();
        const clientes = await fetchClientesByCpfs(rows.map((r) => r.cpf));
        if (!alive) return;
        const out = rows
          .map((r) => buildResumo(r, clientes.get(onlyDigits(r.cpf))))
          .sort((a, b) => (b.aceitoEm || "").localeCompare(a.aceitoEm || ""));
        setData(out);
      } catch (e) {
        if (!alive) return;
        setError(e as Error);
        setData([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return {
    data,
    isLoading,
    isEmpty: !isLoading && data.length === 0,
    error,
    refetch,
  };
}

export interface AsyncOne<T> {
  data: T | null;
  isLoading: boolean;
  notFound: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useContratoDetalhe(id: string | undefined): AsyncOne<ContratoDetalhe> {
  const [state, setState] = useState<AsyncOne<ContratoDetalhe>>({
    data: null,
    isLoading: true,
    notFound: false,
    error: null,
    refetch: () => {},
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const refetch = () => setTick((t) => t + 1);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      setState({ data: null, isLoading: false, notFound: true, error: null, refetch });
      return;
    }
    setState((s) => ({ ...s, isLoading: true, error: null }));
    (async () => {
      try {
        const { data: rowData, error: rowErr } = await supabase
          .from("consent_records")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (rowErr) throw rowErr;
        if (!rowData) {
          if (alive)
            setState({ data: null, isLoading: false, notFound: true, error: null, refetch });
          return;
        }
        const row = rowData as ConsentRow;
        if (row.tipo !== "termo") {
          if (alive)
            setState({ data: null, isLoading: false, notFound: true, error: null, refetch });
          return;
        }

        const cliente = await fetchClienteByCpf(row.cpf);
        const resumo = buildResumo(row, cliente ?? undefined);
        const match = cliente ? matchSessao(cliente, row.criado_em) : null;
        const outros = cliente ? await fetchConsentTermosByCpf(row.cpf) : [];

        const cli: ContratoSnapshotCliente = {
          cpf: onlyDigits(row.cpf),
          cpfMasked: maskCpfSafe(row.cpf),
          nomeCompleto: cliente?.dadosCadastrais?.nomeCompleto || "Titular removido",
          iniciais: iniciais(cliente?.dadosCadastrais?.nomeCompleto || ""),
          documento: formatCpfFull(row.cpf),
          dataNascimento: cliente?.dadosCadastrais?.dataNascimento,
          telefone: cliente?.dadosCadastrais?.telefone,
          email: cliente?.dadosCadastrais?.email,
          endereco: cliente?.dadosCadastrais?.endereco,
        };

        const tatSnap: ContratoSnapshotTatuador | null = resumo.tatuador
          ? { id: tatuadorSlug(resumo.tatuador), displayName: resumo.tatuador }
          : null;

        const historico: ContratoEvento[] = [
          { tipo: "created", em: row.criado_em },
          { tipo: "reviewed", em: row.criado_em },
          {
            tipo: "terms_accepted",
            em: row.criado_em,
            detalhes: `Versão ${row.versao} aceita`,
          },
        ];
        if (resumo.temAssinatura) {
          historico.push({ tipo: "signature_registered", em: row.criado_em });
          historico.push({ tipo: "signed", em: row.criado_em });
        }

        const detalhe: ContratoDetalhe = {
          ...resumo,
          cliente: cli,
          tatuadorSnapshot: tatSnap,
          assinaturaPath: match?.assinaturaPath ?? null,
          textoHash: row.texto_hash ?? null,
          hashAlgoritmo: "SHA-256",
          aceite: {
            userAgent: row.user_agent,
            ip: row.ip,
            device: row.device,
            versao: row.versao,
          },
          historico,
          outrosContratos: outros
            .filter((o) => o.id !== row.id)
            .map((o) => ({
              id: o.id,
              versao: o.versao,
              aceitoEm: o.criado_em,
              status: "signed" as ContratoStatus,
            })),
        };
        if (alive)
          setState({ data: detalhe, isLoading: false, notFound: false, error: null, refetch });
      } catch (e) {
        if (alive)
          setState({ data: null, isLoading: false, notFound: false, error: e as Error, refetch });
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, tick]);

  return state;
}

// ---------------------------------------------------------------------------
// Filtros / busca
// ---------------------------------------------------------------------------

export interface ContratosFilters {
  q: string;
  status: ContratoStatus | null;
  tatuador: string | null;
  assinatura: "com" | "sem" | null;
  origem: "primeira_visita" | "recorrente" | null;
  versao: string | null;
  periodo: "hoje" | "7d" | "30d" | null;
}

export const DEFAULT_CONTRATOS_FILTERS: ContratosFilters = {
  q: "",
  status: null,
  tatuador: null,
  assinatura: null,
  origem: null,
  versao: null,
  periodo: null,
};

function inPeriodo(iso: string, p: ContratosFilters["periodo"]): boolean {
  if (!p) return true;
  const t = new Date(iso).getTime();
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (p === "hoje") return t >= startOfToday.getTime();
  if (p === "7d") return t >= now - 7 * 86400000;
  if (p === "30d") return t >= now - 30 * 86400000;
  return true;
}

export function useContratosFiltrados(
  data: ContratoResumo[],
  filters: ContratosFilters,
): ContratoResumo[] {
  return useMemo(() => {
    const termRaw = filters.q.trim().toLowerCase();
    const termDigits = onlyDigits(filters.q);
    return data.filter((c) => {
      if (filters.status && c.status !== filters.status) return false;
      if (filters.tatuador && (c.tatuador ?? "").toLowerCase() !== filters.tatuador.toLowerCase())
        return false;
      if (filters.assinatura === "com" && !c.temAssinatura) return false;
      if (filters.assinatura === "sem" && c.temAssinatura) return false;
      if (filters.origem && c.origem !== filters.origem) return false;
      if (filters.versao && c.versao !== filters.versao) return false;
      if (!inPeriodo(c.aceitoEm, filters.periodo)) return false;
      if (termRaw) {
        const hitText =
          c.clienteNome.toLowerCase().includes(termRaw) ||
          (c.tatuador ?? "").toLowerCase().includes(termRaw) ||
          c.id.toLowerCase().includes(termRaw) ||
          c.versao.toLowerCase().includes(termRaw);
        const hitDigits = termDigits.length > 0 && c.cpf.includes(termDigits);
        if (!hitText && !hitDigits) return false;
      }
      return true;
    });
  }, [data, filters]);
}

// ---------------------------------------------------------------------------
// Debounce util
// ---------------------------------------------------------------------------

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setV(value), ms);
    return () => clearTimeout(h);
  }, [value, ms]);
  return v;
}

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

export const STATUS_LABEL: Record<ContratoStatus, string> = {
  signed: "Assinado",
  cancelled: "Cancelado",
  superseded: "Substituído",
  error: "Com erro",
};

export const ORIGEM_LABEL: Record<"primeira_visita" | "recorrente", string> = {
  primeira_visita: "Primeira visita",
  recorrente: "Recorrente",
};

export const EVENT_LABEL: Record<ContratoEventoTipo, string> = {
  created: "Contrato criado",
  reviewed: "Dados revisados",
  terms_accepted: "Termos aceitos",
  signature_registered: "Assinatura registrada",
  signed: "Contrato concluído",
  pdf_generated: "PDF gerado",
};

export { CONTRACT_TEMPLATES };
