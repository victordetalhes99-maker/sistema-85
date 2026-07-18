// ============================================================================
// Templates versionados do contrato (termo) — 85 TATTOO
// ----------------------------------------------------------------------------
// Cada versão traz o texto exato exibido ao cliente naquele momento. O hash
// SHA-256 desse texto é persistido em `consent_records.texto_hash` na hora do
// aceite, o que permite:
//   • reconstruir o texto assinado a partir de (versão, tatuador);
//   • verificar integridade comparando o hash armazenado com o hash do texto
//     reconstruído.
// NUNCA alterar o texto de uma versão publicada — sempre adicionar nova versão.
// ============================================================================

import { buildTermoTexto } from "@/lib/termo";

export interface ContractTemplate {
  /** ID estável do template (não muda entre versões). */
  id: string;
  /** Nome amigável exibido na UI. */
  nome: string;
  /** Versão semântica curta (bate com `consent_records.versao`). */
  versao: string;
  /** Data de vigência ISO. */
  vigenciaInicio: string;
  /** Reconstrução do texto exato exibido ao cliente. */
  build: (params: { tatuador: string }) => string;
  ativo: boolean;
}

// v1 — versão em vigência desde a estreia do módulo administrativo.
const V1: ContractTemplate = {
  id: "termo-atendimento",
  nome: "Termo de atendimento e responsabilidade",
  versao: "v1",
  vigenciaInicio: "2025-01-01",
  build: ({ tatuador }) => buildTermoTexto(tatuador),
  ativo: true,
};

export const CONTRACT_TEMPLATES: readonly ContractTemplate[] = [V1];

export function getContractTemplate(versao: string | null | undefined): ContractTemplate {
  return CONTRACT_TEMPLATES.find((t) => t.versao === (versao ?? "v1")) ?? V1;
}

export function activeContractTemplate(): ContractTemplate {
  return CONTRACT_TEMPLATES.find((t) => t.ativo) ?? V1;
}

/** SHA-256 hex — mesma função de `src/lib/lgpd-consent.ts` (mantida local para evitar ciclo). */
export async function sha256Hex(texto: string): Promise<string> {
  const enc = new TextEncoder().encode(texto);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
