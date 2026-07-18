// ============================================================================
// Exportações do módulo Contratos
// ----------------------------------------------------------------------------
//   • exportContratosPdf  — PDF da listagem filtrada (auditoria e arquivo)
//   • exportContratosXlsx — planilha equivalente
//   • gerarContratoPdf    — PDF individual do contrato assinado (formal, com
//                           texto reconstruído da versão + assinatura embutida
//                           + verificação de hash de integridade)
// ============================================================================

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getAssinaturaUrl } from "@/lib/clientes";
import {
  formatDateBR,
  formatDateTimeBR,
  ORIGEM_LABEL,
  STATUS_LABEL,
  type ContratoDetalhe,
  type ContratoResumo,
  type ContratosFilters,
} from "./index";
import { getContractTemplate, sha256Hex } from "./templates";

const GOLD: [number, number, number] = [201, 162, 39];
const BLACK: [number, number, number] = [17, 17, 17];
const GRAPHITE: [number, number, number] = [60, 60, 60];

function now() {
  return new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function fileBase(prefix = "contratos"): string {
  return `85-tattoo-${prefix}-${new Date().toISOString().slice(0, 10)}`;
}

function filtersLines(f: ContratosFilters, total: number): string[] {
  const out: string[] = [];
  if (f.q.trim()) out.push(`Pesquisa: "${f.q.trim()}"`);
  if (f.status) out.push(`Status: ${STATUS_LABEL[f.status]}`);
  if (f.tatuador) out.push(`Tatuador: ${f.tatuador}`);
  if (f.assinatura) out.push(`Assinatura: ${f.assinatura === "com" ? "presente" : "ausente"}`);
  if (f.origem) out.push(`Origem: ${ORIGEM_LABEL[f.origem]}`);
  if (f.versao) out.push(`Versão: ${f.versao}`);
  if (f.periodo)
    out.push(
      `Período: ${f.periodo === "hoje" ? "hoje" : f.periodo === "7d" ? "últimos 7 dias" : "últimos 30 dias"}`,
    );
  out.push(`Registros: ${total}`);
  return out;
}

// ---------------------------------------------------------------------------
// Listagem — PDF
// ---------------------------------------------------------------------------

export function exportContratosPdf(rows: ContratoResumo[], filters: ContratosFilters): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BLACK);
  doc.rect(0, 0, w, 68, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 68, w, 2, "F");

  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("85 TATTOO", 40, 34);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Contratos e termos assinados", 40, 54);
  doc.setTextColor(220, 220, 220);
  doc.setFontSize(9);
  doc.text(`Gerado em ${now()}`, w - 40, 34, { align: "right" });

  doc.setTextColor(...GRAPHITE);
  doc.setFontSize(9);
  const lines = filtersLines(filters, rows.length);
  lines.forEach((l, i) => doc.text(l, 40, 92 + i * 12));

  const startY = 92 + lines.length * 12 + 8;

  autoTable(doc, {
    startY,
    head: [["Cliente", "CPF", "Tatuador", "Origem", "Versão", "Status", "Assin.", "Aceito em"]],
    body: rows.map((r) => [
      r.clienteNome || "—",
      r.cpfMasked,
      r.tatuador ?? "—",
      ORIGEM_LABEL[r.origem],
      r.versao,
      STATUS_LABEL[r.status],
      r.temAssinatura ? "Sim" : "—",
      formatDateTimeBR(r.aceitoEm),
    ]),
    styles: { fontSize: 9, cellPadding: 6, textColor: GRAPHITE },
    headStyles: { fillColor: BLACK, textColor: GOLD, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 40, right: 40 },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `85 TATTOO — Contratos • Página ${i} de ${pages}`,
      w / 2,
      doc.internal.pageSize.getHeight() - 18,
      { align: "center" },
    );
  }

  doc.save(`${fileBase("contratos")}.pdf`);
}

// ---------------------------------------------------------------------------
// Listagem — XLSX
// ---------------------------------------------------------------------------

export function exportContratosXlsx(rows: ContratoResumo[], filters: ContratosFilters): void {
  const wb = XLSX.utils.book_new();
  const resumo = [
    ["85 TATTOO — Contratos e termos"],
    [`Gerado em ${now()}`],
    [],
    ...filtersLines(filters, rows.length).map((l) => [l]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");

  const header = [
    "ID",
    "Cliente",
    "CPF",
    "Tatuador",
    "Origem",
    "Template",
    "Versão",
    "Status",
    "Assinatura",
    "PDF",
    "Aceito em",
  ];
  const body = rows.map((r) => [
    r.id,
    r.clienteNome,
    r.cpfMasked,
    r.tatuador ?? "",
    ORIGEM_LABEL[r.origem],
    r.templateId,
    r.versao,
    STATUS_LABEL[r.status],
    r.temAssinatura ? "Sim" : "",
    r.temPdf ? "Sim" : "",
    formatDateTimeBR(r.aceitoEm),
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...body]), "Contratos");

  XLSX.writeFile(wb, `${fileBase("contratos")}.xlsx`);
}

// ---------------------------------------------------------------------------
// Contrato individual — PDF formal
// ---------------------------------------------------------------------------

async function fetchSignatureDataUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const url = await getAssinaturaUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarContratoPdf(contrato: ContratoDetalhe): Promise<void> {
  const tpl = getContractTemplate(contrato.versao);
  const texto = tpl.build({ tatuador: contrato.tatuador ?? "—" });
  const hashCalc = await sha256Hex(texto);
  const integridade = contrato.textoHash
    ? hashCalc === contrato.textoHash
      ? "íntegro"
      : "divergente"
    : "não verificado";
  const signatureDataUrl = await fetchSignatureDataUrl(contrato.assinaturaPath);

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 50;
  const contentW = pageW - marginX * 2;

  // Cabeçalho
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 90, pageW, 3, "F");

  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("85 TATTOO", marginX, 42);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(tpl.nome, marginX, 66);
  doc.setFontSize(9);
  doc.setTextColor(220, 220, 220);
  doc.text(`Versão ${contrato.versao}`, pageW - marginX, 42, { align: "right" });
  doc.text(`Emitido em ${now()}`, pageW - marginX, 60, { align: "right" });

  // Bloco de identificação
  let y = 120;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageW - marginX, y);
  y += 18;
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Contratante", marginX, y);
  doc.text("Contratado", pageW / 2 + 10, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAPHITE);

  const left = [
    contrato.cliente.nomeCompleto,
    `CPF ${contrato.cliente.documento}`,
    contrato.cliente.telefone ? `Tel: ${contrato.cliente.telefone}` : "",
    contrato.cliente.email ?? "",
  ].filter(Boolean);
  const right = [
    "85 TATTOO Studio",
    `Tatuador: ${contrato.tatuador ?? "—"}`,
    `Origem: ${ORIGEM_LABEL[contrato.origem]}`,
  ];
  left.forEach((l, i) => doc.text(l, marginX, y + i * 13));
  right.forEach((l, i) => doc.text(l, pageW / 2 + 10, y + i * 13));
  y += Math.max(left.length, right.length) * 13 + 12;

  doc.setDrawColor(230, 230, 230);
  doc.line(marginX, y, pageW - marginX, y);
  y += 18;

  // Corpo do termo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("Termo aceito pelo contratante", marginX, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAPHITE);

  const wrapped = doc.splitTextToSize(texto, contentW);
  for (const line of wrapped) {
    if (y > pageH - 200) {
      doc.addPage();
      y = 60;
    }
    doc.text(line, marginX, y);
    y += 13;
  }

  y += 20;
  if (y > pageH - 220) {
    doc.addPage();
    y = 60;
  }

  // Assinatura
  doc.setDrawColor(...GOLD);
  doc.line(marginX, y, pageW - marginX, y);
  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text("Assinatura digital do contratante", marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAPHITE);

  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, "PNG", marginX, y, 200, 70);
    } catch {
      doc.text("[assinatura não pôde ser renderizada]", marginX, y + 30);
    }
  } else {
    doc.setTextColor(150, 30, 30);
    doc.text("Nenhuma assinatura registrada para este aceite.", marginX, y + 20);
    doc.setTextColor(...GRAPHITE);
  }

  const rightX = pageW - marginX;
  const infoY = y;
  const info = [
    `Assinado em: ${formatDateTimeBR(contrato.assinadoEm)}`,
    `Aceite registrado: ${formatDateTimeBR(contrato.aceitoEm)}`,
    `IP: ${contrato.aceite.ip ?? "—"}`,
    `User-Agent: ${(contrato.aceite.userAgent ?? "—").slice(0, 60)}`,
    `Contrato: ${contrato.id}`,
  ];
  info.forEach((l, i) => doc.text(l, rightX, infoY + 12 + i * 12, { align: "right" }));

  y += 100;
  if (y > pageH - 90) {
    doc.addPage();
    y = 60;
  }

  // Bloco de integridade
  doc.setDrawColor(230, 230, 230);
  doc.line(marginX, y, pageW - marginX, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text("Integridade do documento", marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAPHITE);
  const integridadeLinhas = [
    `Algoritmo: SHA-256 • Status: ${integridade}`,
    `Hash armazenado: ${contrato.textoHash ?? "—"}`,
    `Hash recalculado: ${hashCalc}`,
    `Template: ${tpl.id} • Versão ${tpl.versao} • Vigência ${formatDateBR(tpl.vigenciaInicio)}`,
  ];
  integridadeLinhas.forEach((l, i) => doc.text(l, marginX, y + i * 11));

  // Rodapé
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `85 TATTOO — Contrato ${contrato.id} • Página ${i} de ${pages}`,
      pageW / 2,
      pageH - 18,
      { align: "center" },
    );
  }

  const safeCpf = contrato.cliente.cpf;
  doc.save(`85-tattoo-contrato-${safeCpf}-${contrato.versao}-${contrato.id.slice(0, 8)}.pdf`);
}
