-- =============================================================================
-- FIX: 3 Production Blockers
-- Execute no Supabase Dashboard -> SQL Editor
-- Projeto: gsoevvflqrfqyqpewzwv
-- Data: 2026-07-22
-- =============================================================================

-- =============================================================================
-- BLOCKER 1: tattoo_artists RLS quebrada para anon
-- Problema: policy unificada (anon + authenticated) chama is_admin(), mas anon
--           não tem EXECUTE na função is_admin() → 42501 permission denied
-- Fix: separar em duas policies por role
-- =============================================================================

DROP POLICY IF EXISTS "Public read active tattoo_artists" ON public.tattoo_artists;

-- anon só enxerga artistas ativos (sem chamar is_admin)
CREATE POLICY "anon read active tattoo_artists"
ON public.tattoo_artists FOR SELECT TO anon
USING (ativo = true);

-- authenticated enxerga ativos OU admin enxerga todos
CREATE POLICY "auth read tattoo_artists"
ON public.tattoo_artists FOR SELECT TO authenticated
USING (ativo = true OR public.is_admin());

-- =============================================================================
-- BLOCKER 2: checkin_append_sessao não existe em produção
-- Problema: RPC chamado em src/lib/clientes.ts:addSessao() mas ausente no schema
-- Fix: criar a função (versão final do bootstrap de produção)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.checkin_append_sessao(
  _cpf text,
  _sessao jsonb,
  _anamnese jsonb DEFAULT NULL,
  _tatuador text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf_d text := regexp_replace(coalesce(_cpf, ''), '\D', '', 'g');
BEGIN
  IF octet_length(coalesce(_sessao::text, '')) > 1048576 THEN
    RAISE EXCEPTION 'Sessao grande';
  END IF;

  UPDATE public.clientes
     SET sessoes = coalesce(sessoes, '[]'::jsonb) || coalesce(_sessao, '{}'::jsonb),
         anamnese = coalesce(_anamnese, anamnese),
         tatuador = coalesce(nullif(trim(_tatuador), ''), tatuador),
         dados_cadastrais = CASE
           WHEN nullif(trim(_tatuador), '') IS NOT NULL THEN
             jsonb_set(coalesce(dados_cadastrais, '{}'::jsonb), '{tatuador}', to_jsonb(trim(_tatuador)), true)
           ELSE dados_cadastrais
         END,
         atualizado_em = now()
   WHERE cpf = cpf_d;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cliente nao encontrado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.checkin_append_sessao(text, jsonb, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checkin_append_sessao(text, jsonb, jsonb, text) TO anon, authenticated;

-- =============================================================================
-- VALIDAÇÃO: rode estas queries para confirmar que os fixes funcionaram
-- =============================================================================

-- Teste 1: listar policies de tattoo_artists (deve mostrar 2 novas)
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'tattoo_artists';

-- Teste 2: verificar se checkin_append_sessao existe agora
SELECT proname, pronargs
FROM pg_proc
WHERE proname = 'checkin_append_sessao';
