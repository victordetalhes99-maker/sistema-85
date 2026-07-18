export const CONSENT_TEXT_VERSION = "2026-07-lgpd-v2";

export const LGPD_REQUIRED_TEXT = `TRATAMENTO DE DADOS PESSOAIS E SENSIVEIS

Ao prosseguir, o titular confirma ciencia de que os dados cadastrais, de contato, de assinatura e de saude estritamente necessarios ao atendimento poderao ser coletados, armazenados e tratados para:

1. identificacao civil e operacional do atendimento;
2. execucao segura do procedimento e triagem previa;
3. cumprimento de obrigacoes legais, regulatorias, sanitarias e de guarda;
4. registro de consentimentos, auditoria, prevencao a fraude e seguranca da operacao.

Este aceite obrigatorio nao autoriza, por si so, uso promocional de imagem.`;

export const IMAGE_CONSENT_TEXT = `AUTORIZACAO OPCIONAL DE USO DE IMAGEM

O uso de fotografia, video ou imagens do procedimento para portfolio, redes sociais, publicidade ou materiais promocionais depende de autorizacao separada, opcional e revogavel. A recusa nao impede cadastro, atendimento nem procedimento.`;

export const LGPD_TEXTO = LGPD_REQUIRED_TEXT;

export const IMAGE_CONSENT_PURPOSES = [
  "portfolio",
  "redes_sociais",
  "publicidade",
  "materiais_promocionais",
] as const;

export type ImageConsentPurpose = (typeof IMAGE_CONSENT_PURPOSES)[number];

export function buildPrivacyNotice(studioName = "[PREENCHER NOME FANTASIA]"): string {
  return `AVISO DE PRIVACIDADE
Versao: ${CONSENT_TEXT_VERSION}
Ultima atualizacao: [PREENCHER DATA]

Controlador:
- Nome empresarial: [PREENCHER RAZAO SOCIAL]
- Nome fantasia: ${studioName}
- CNPJ ou identificacao aplicavel: [PREENCHER DOCUMENTO]
- Endereco: [PREENCHER ENDERECO]
- Canal de contato: [PREENCHER CANAL]
- Canal LGPD: [PREENCHER E-MAIL DE PRIVACIDADE]
- Responsavel/encarregado: [PREENCHER RESPONSAVEL]

Categorias de dados:
- cadastrais e contato;
- dados de atendimento e assinatura;
- dados pessoais sensiveis de saude declarados pelo titular;
- registros tecnicos, consentimentos, logs administrativos e solicitacoes LGPD.

Finalidades:
- cadastro, autenticacao operacional, execucao do procedimento, suporte, seguranca, auditoria, retencao e cumprimento legal/regulatorio.

Bases legais sugeridas:
- execucao de procedimentos e medidas pre-contratuais;
- cumprimento de obrigacao legal ou regulatoria;
- exercicio regular de direitos;
- tutela da saude, quando aplicavel;
- consentimento especifico, quando opcional.
Observacao: revisar juridicamente antes de uso definitivo.

Fornecedores e compartilhamentos mapeados:
- Supabase;
- Cloudflare;
- GitHub;
- Lovable;
- Google, caso a integracao seja habilitada;
- WhatsApp, caso utilizado operacionalmente;
- servicos de e-mail;
- demais fornecedores identificados em ambiente produtivo.

Retencao e seguranca:
- observar a matriz tecnica de retencao configuravel;
- nao ha promessa de eliminacao automatica imediata;
- acessos administrativos, trilhas de auditoria e storage privado sao controlados por perfil e necessidade.

Direitos do titular:
- confirmar tratamento;
- acessar, corrigir, anonimizar, bloquear ou solicitar eliminacao quando aplicavel;
- revogar autorizacoes opcionais de uso de imagem;
- solicitar informacoes sobre compartilhamentos e retencao.

Consequencias de nao fornecer dados obrigatorios:
- o procedimento, a validacao de seguranca ou o cumprimento regulatorio podem ficar inviabilizados.

Texto pendente de revisao juridica especializada antes do uso definitivo.`;
}
