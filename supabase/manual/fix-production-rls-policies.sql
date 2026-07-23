-- =============================================================================
-- FIX: Políticas RLS ausentes em produção (cadastro público bloqueado)
-- Execute no Supabase Dashboard -> SQL Editor
-- Projeto: gsoevvflqrfqyqpewzwv
-- Data: 2026-07-22
-- =============================================================================
-- Contexto: os GRANTs de tabela já existem (grant insert on clientes to anon, etc.)
-- O que está faltando são as RLS policies WITH CHECK que autorizam a escrita.
-- Sem elas, RLS bloqueia todos os INSERTs de anon (42501 permission denied).
-- =============================================================================

-- =============================================================================
-- FIX 1: clientes — policy de INSERT para anon (cadastro público)
-- Impacto: sem isso, nenhum novo cliente consegue se cadastrar no check-in.
-- =============================================================================

-- Garantir que tg_validate_cliente exista (function de trigger de validação)
CREATE OR REPLACE FUNCTION public.tg_validate_cliente()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_anon boolean := (auth.uid() IS NULL);
  birth_date text;
  birth_ts date;
  age_years integer;
BEGIN
  new.cpf := regexp_replace(coalesce(new.cpf, ''), '\D', '', 'g');
  IF new.cpf !~ '^[0-9]{11}$' THEN RAISE EXCEPTION 'CPF invalido'; END IF;

  new.nome_completo := btrim(coalesce(new.nome_completo, ''));
  IF length(new.nome_completo) < 2 OR length(new.nome_completo) > 200 THEN
    RAISE EXCEPTION 'Nome invalido';
  END IF;
  IF new.telefone IS NOT NULL AND length(new.telefone) > 32 THEN
    RAISE EXCEPTION 'Telefone longo';
  END IF;
  IF new.email IS NOT NULL AND length(new.email) > 254 THEN
    RAISE EXCEPTION 'E-mail longo';
  END IF;
  IF new.tatuador IS NOT NULL AND length(new.tatuador) > 120 THEN
    RAISE EXCEPTION 'Tatuador invalido';
  END IF;
  IF pg_column_size(new.dados_cadastrais) > 16384 THEN
    RAISE EXCEPTION 'dados grandes';
  END IF;
  IF pg_column_size(new.anamnese) > 16384 THEN
    RAISE EXCEPTION 'anamnese grande';
  END IF;
  IF pg_column_size(new.sessoes) > 20971520 THEN
    RAISE EXCEPTION 'sessoes grandes';
  END IF;
  IF new.assinatura IS NOT NULL AND length(new.assinatura) > 2000000 THEN
    RAISE EXCEPTION 'assinatura grande';
  END IF;

  birth_date := coalesce(new.dados_cadastrais->>'dataNascimento', '');
  IF birth_date <> '' THEN
    birth_ts := birth_date::date;
    age_years := date_part('year', age(current_date, birth_ts));
    new.dados_cadastrais := jsonb_set(coalesce(new.dados_cadastrais, '{}'::jsonb), '{idadeCalculada}', to_jsonb(age_years), true);
    new.dados_cadastrais := jsonb_set(new.dados_cadastrais, '{faixaEtaria}', to_jsonb(CASE WHEN age_years < 18 THEN 'menor' ELSE 'adulto' END), true);
    new.dados_cadastrais := jsonb_set(new.dados_cadastrais, '{guardianValidationStatus}', to_jsonb(CASE WHEN age_years < 18 THEN 'pending' ELSE 'not_required' END), true);
    IF age_years < 18 THEN new.status := 'pendente_responsavel'; END IF;
  END IF;

  IF is_anon THEN
    new.criado_em := now();
    new.atualizado_em := now();
    IF new.status NOT IN ('aguardando', 'pendente_responsavel') THEN
      new.status := 'aguardando';
    END IF;
  END IF;

  IF new.status NOT IN ('aguardando', 'atendido', 'pendente_responsavel') THEN
    RAISE EXCEPTION 'Status invalido';
  END IF;

  RETURN new;
END;
$$;

-- Garantir trigger existente
DROP TRIGGER IF EXISTS validate_cliente_biu ON public.clientes;
CREATE TRIGGER validate_cliente_biu
BEFORE INSERT OR UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_cliente();

-- GRANT de tabela (idempotente)
GRANT INSERT ON public.clientes TO anon;

-- Policy de INSERT para anon
DROP POLICY IF EXISTS "Public check-in insert" ON public.clientes;
CREATE POLICY "Public check-in insert"
ON public.clientes
FOR INSERT
TO anon, authenticated
WITH CHECK (
  cpf ~ '^[0-9]{11}$'
  AND length(nome_completo) BETWEEN 2 AND 200
  AND status IN ('aguardando', 'pendente_responsavel')
);

-- =============================================================================
-- FIX 2: data_subject_requests — policy de INSERT para anon (formulário LGPD)
-- Impacto: sem isso, a solicitação LGPD falha mesmo após Turnstile OK.
-- =============================================================================

-- GRANT de tabela (idempotente)
GRANT INSERT ON public.data_subject_requests TO anon, authenticated;

-- Policy de INSERT para anon
DROP POLICY IF EXISTS "Public DSR insert" ON public.data_subject_requests;
CREATE POLICY "Public DSR insert"
ON public.data_subject_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  cpf ~ '^[0-9]{11}$'
  AND tipo IN ('delete', 'anonymize', 'export', 'rectify')
  AND status = 'pendente'
);

-- =============================================================================
-- VALIDAÇÃO: rode estas queries após aplicar o SQL
-- =============================================================================

-- Deve mostrar "Public check-in insert" na lista:
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'clientes';

-- Deve mostrar "Public DSR insert" na lista:
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'data_subject_requests';

-- Deve retornar 1 linha (trigger existe):
SELECT tgname FROM pg_trigger WHERE tgname = 'validate_cliente_biu';
