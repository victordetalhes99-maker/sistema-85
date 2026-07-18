import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { addSessao, getCliente, type ClientePublico, type Anamnese } from "@/lib/clientes";
import { toErrorLike } from "@/lib/errors";
import { SignaturePad } from "@/components/SignaturePad";
import { buildTermoTexto, TATUADORES } from "@/lib/termo";
import { CONSENT_TEXT_VERSION, LGPD_REQUIRED_TEXT } from "@/lib/lgpd";
import { rateLimit, registrarConsentimento } from "@/lib/lgpd-consent";
import { logSecure } from "@/lib/logger";

type Modo = "termo" | "sucesso";

export default function RecorrentePage() {
  const cpf = (typeof window !== "undefined" && sessionStorage.getItem("checkin_cpf")) || "";
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<ClientePublico | null>(null);
  const [modo, setModo] = useState<Modo>("termo");
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [aceito, setAceito] = useState(false);
  const [aceitoLgpd, setAceitoLgpd] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [tatuadorSelecionado, setTatuadorSelecionado] = useState("");
  const [tatuadorOutro, setTatuadorOutro] = useState("");
  const [busca, setBusca] = useState("");
  const tatuadorFinal = (tatuadorSelecionado || tatuadorOutro).trim();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await getCliente(cpf);
      if (cancelled) return;
      if (!c) {
        navigate("/");
        return;
      }
      setCliente(c);
      const anterior = c.tatuador?.trim() ?? "";
      if (anterior) {
        if ((TATUADORES as readonly string[]).includes(anterior)) setTatuadorSelecionado(anterior);
        else setTatuadorOutro(anterior);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cpf, navigate]);

  const filtrados = useMemo(
    () =>
      (TATUADORES as readonly string[]).filter((t) =>
        t.toLowerCase().includes(busca.toLowerCase()),
      ),
    [busca],
  );

  if (!cliente) return null;

  const primeiroNome = cliente.nomeCompleto.split(" ")[0];

  const finalizar = async () => {
    if (!assinatura || !aceito || !aceitoLgpd || !tatuadorFinal || enviando) return;
    const sessao = {
      data: new Date().toISOString(),
      assinatura,
      anamnese: {} as unknown as Anamnese,
      tatuador: tatuadorFinal,
    };
    setEnviando(true);
    setErroEnvio(null);
    try {
      const ok = await rateLimit(`cpf:${cpf}:recorrente`, 10, 3600);
      if (!ok) {
        const m = "Muitas tentativas em pouco tempo. Aguarde alguns minutos.";
        setErroEnvio(m);
        toast.error(m);
        return;
      }
      await addSessao(cpf, sessao);
      await Promise.allSettled([
        registrarConsentimento({
          cpf,
          tipo: "lgpd",
          texto: LGPD_REQUIRED_TEXT,
          versao: CONSENT_TEXT_VERSION,
          finalidade: "tratamento_dados_procedimento",
          contexto: "sessao_recorrente",
        }),
        registrarConsentimento({
          cpf,
          tipo: "termo",
          texto: buildTermoTexto(tatuadorFinal),
          versao: CONSENT_TEXT_VERSION,
          finalidade: "autorizacao_procedimento",
          contexto: "sessao_recorrente",
        }),
      ]);
      setModo("sucesso");
    } catch (e) {
      const el = toErrorLike(e);
      logSecure("warn", "recorrente falhou", { message: el.message, statusCode: el.statusCode });
      const m = el.message ?? "";
      const msg =
        m.includes("storage") || m.includes("upload") || el.statusCode
          ? "Nao conseguimos enviar sua assinatura. Verifique sua conexao e toque em Reenviar."
          : "Nao foi possivel registrar a sessao. Toque em Reenviar para tentar de novo.";

      setErroEnvio(msg);
      toast.error(msg, {
        action: { label: "Reenviar", onClick: () => finalizar() },
        duration: 10000,
      });
    } finally {
      setEnviando(false);
    }
  };

  if (modo === "sucesso") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-strong rounded-2xl p-10 max-w-md text-center">
          <div
            className="mx-auto size-16 rounded-full flex items-center justify-center mb-5"
            style={{ background: "var(--gradient-gold)" }}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ color: "oklch(0.15 0.005 270)" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-light mb-2">Sessao registrada!</h2>
          <p className="text-muted-foreground mb-6">
            Bom trabalho, {primeiroNome}. A recepcao ja recebeu sua assinatura.
          </p>
          <button
            onClick={() => navigate("/")}
            className="btn-ghost-gold w-full px-6 py-3 rounded-xl uppercase tracking-[0.2em] text-sm"
          >
            Voltar ao inicio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-gold"
        >
          {"<- Inicio"}
        </Link>

        <header className="mt-6 mb-8">
          <p className="text-[10px] tracking-[0.5em] text-gold/80 uppercase mb-2">
            Bom ver voce de volta!
          </p>
          <h1 className="text-3xl sm:text-4xl font-light">
            Ola, <span className="gradient-gold-text font-serif italic">{primeiroNome}</span>!
          </h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Confirme o tatuador, releia o termo e assine para liberar a sessao de hoje.
          </p>
        </header>

        <section className="glass-strong rounded-2xl p-5 sm:p-8">
          <h2 className="text-xl font-light mb-1">Termo de responsabilidade</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Voce pode manter o mesmo tatuador da ultima visita ou escolher outro.
          </p>

          <div className="mb-6">
            <p className="text-[10px] tracking-[0.3em] text-gold/80 uppercase mb-3">
              Tatuador responsavel
            </p>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar tatuador..."
              className="luxury-input w-full rounded-xl px-4 py-3 mb-2"
            />
            <select
              className="luxury-input w-full rounded-xl px-4 py-3"
              value={tatuadorSelecionado}
              onChange={(e) => {
                setTatuadorSelecionado(e.target.value);
                if (e.target.value) setTatuadorOutro("");
              }}
            >
              <option value="">Selecione seu tatuador</option>
              {filtrados.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {tatuadorFinal && (
              <p className="text-[11px] text-gold/80 mt-2">
                Profissional selecionado: <span className="font-medium">{tatuadorFinal}</span>
              </p>
            )}
          </div>

          <div className="glass rounded-xl p-5 max-h-72 overflow-y-auto text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
            {buildTermoTexto(tatuadorFinal)}
          </div>

          <label className="flex items-start gap-3 mt-5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={aceito}
              onChange={(e) => setAceito(e.target.checked)}
              className="mt-1 size-4 accent-[oklch(0.82_0.13_85)]"
            />
            <span className="text-sm text-foreground/85">
              Li, compreendi e aceito o termo necessario ao procedimento.
            </span>
          </label>

          <div className="mt-8">
            <p className="text-[10px] tracking-[0.3em] text-gold/80 uppercase mb-3">
              Protecao de dados - LGPD
            </p>
            <div className="glass rounded-xl p-5 max-h-60 overflow-y-auto text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
              {LGPD_REQUIRED_TEXT}
            </div>
            <label className="flex items-start gap-3 mt-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aceitoLgpd}
                onChange={(e) => setAceitoLgpd(e.target.checked)}
                className="mt-1 size-4 accent-[oklch(0.82_0.13_85)]"
              />
              <span className="text-sm text-foreground/85">
                Li, compreendi e aceito o tratamento dos dados estritamente necessario a sessao.
              </span>
            </label>
          </div>

          <div className="mt-6">
            <p className="text-[10px] tracking-[0.3em] text-gold/80 uppercase mb-3">
              Assinatura digital - sessao de hoje
            </p>
            <SignaturePad value={assinatura ?? undefined} onChange={setAssinatura} />
          </div>

          <div className="mt-8">
            <button
              onClick={finalizar}
              disabled={!assinatura || !aceito || !aceitoLgpd || !tatuadorFinal || enviando}
              className="btn-gold w-full px-6 py-3.5 rounded-xl uppercase tracking-[0.2em] text-sm"
            >
              {enviando ? "Enviando..." : erroEnvio ? "Reenviar" : "Finalizar e enviar"}
            </button>
            {erroEnvio && (
              <div className="mt-4 p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-sm">
                <p className="font-medium text-destructive mb-1">Falha no envio</p>
                <p className="text-foreground/80">{erroEnvio}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
