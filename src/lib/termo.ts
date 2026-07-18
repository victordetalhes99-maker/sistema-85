export const TATUADORES: readonly string[] = [
  "Alef",
  "Alone",
  "Atila",
  "Formiga",
  "Freestyle",
  "Gabriel GL",
  "Grego",
  "Hendruway",
  "Hiago",
  "Honorio",
  "Johziano",
  "Jonathan",
  "Kauany",
  "Lara Molina",
  "Lipe",
  "Luana",
  "Marcos",
  "Mateus Rattu",
  "Natan",
  "PH Essenza",
  "Rafael Gomes",
  "Rafael Voltagem",
  "Sarah Nicodemos",
  "Strong",
  "Tal Preto",
  "Thais Lisboa",
  "Thiago Brito",
  "Thiago C Ink",
];

export function buildAnamneseAvisos(tatuador?: string) {
  const nome = tatuador?.trim() ? tatuador : "____________________";
  return `DECLARACAO DE CIENCIA DE RISCOS

Declaro estar informado(a) sobre possiveis complicacoes e cuidados associados ao procedimento, inclusive quanto a alergias, infeccoes, queloides, reacoes organicas, condicoes de saude preexistentes e necessidade de procurar servico de saude diante de sinais anormais.

Algumas condicoes podem exigir avaliacao medica previa, revisao administrativa adicional ou adiamento do procedimento.

CONSENTIMENTO DE EXECUCAO

Em conformidade com o descrito, dou meu consentimento para que o profissional ${nome} execute a aplicacao, observadas as validacoes internas, sanitarias e documentais cabiveis.`;
}

export function buildTermoTexto(tatuador?: string) {
  const nome = tatuador?.trim() ? tatuador : "[PREENCHER PROFISSIONAL]";
  return `TERMO DE RESPONSABILIDADE E CIENCIA DO PROCEDIMENTO

Partes:
- Cliente/titular: identificado no cadastro.
- Profissional responsavel: ${nome}.
- Estabelecimento: [PREENCHER IDENTIFICACAO DO ESTABELECIMENTO].

O cliente declara que forneceu informacoes veridicas sobre seu estado de saude, contatos e historico relevante. Informacoes incompletas ou inexatas podem comprometer a seguranca do atendimento.

O profissional e o estabelecimento assumem deveres proprios de cuidado, higiene, orientacao, registro e conducao do procedimento dentro de suas atribuicoes. Este termo nao elimina responsabilidades legais, contratuais, regulatorias ou sanitarias aplicaveis.

O procedimento envolve riscos inerentes, variacoes biologicas, necessidade de cuidados pre e pos-procedimento e possibilidade de orientacoes adicionais conforme analise tecnica.

O uso promocional de imagem nao integra este aceite e depende de autorizacao opcional separada.

Canal de contato: [PREENCHER CANAL OFICIAL].
Versao do termo: 2026-07-termo-v2.

Texto pendente de revisao juridica especializada antes do uso definitivo.`;
}

export const TERMO_TEXTO = buildTermoTexto();
