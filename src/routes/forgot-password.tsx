import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "Recuperar senha — 85 TATTOO";
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setSubmitting(true);
    try {
      // Resposta sempre genérica — não revela se conta existe.
      await supabase.auth.resetPasswordForEmail(clean, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      /* silencioso */
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <div className="admin-shell flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--gold)]/40 bg-background/60">
            <Mail className="h-5 w-5 text-[color:var(--gold)]" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">
            Recuperar senha
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Enviaremos instruções para o e-mail informado, se houver uma conta vinculada.
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-border/60 bg-background/60 p-6 text-sm text-muted-foreground">
            Se existir uma conta vinculada a esse e-mail, enviaremos as instruções em instantes.
            Verifique também a pasta de spam.
            <div className="mt-4">
              <Link to="/admin-login" className="text-xs text-[color:var(--gold)] hover:underline">
                ← Voltar ao login
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-6"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                "Enviar instruções"
              )}
            </Button>
            <div className="text-center">
              <Link
                to="/admin-login"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
