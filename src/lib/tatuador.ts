// Normaliza e agrupa nomes de tatuadores escritos de formas diferentes.
// Ex.: "Lara Molina", "lara molina ", "Molina" → todos viram "Lara Molina".

import { TATUADORES } from "./termo";

export function normalizeTatuador(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  const n = normalizeTatuador(s);
  return n ? n.split(" ").filter(Boolean) : [];
}

function isSubset(a: string[], b: string[]): boolean {
  if (a.length === 0) return false;
  return a.every((t) => b.includes(t));
}

interface Cluster {
  names: string[];
  tokenSet: string[]; // união de tokens de todos os membros
}

/**
 * Constrói um mapa rawName → canonicalName. Agrupa nomes cujos tokens
 * (palavras normalizadas) são subconjunto/superconjunto entre si.
 * O canonical preferido é (1) um nome presente na lista oficial TATUADORES,
 * (2) o nome com mais tokens, (3) o mais longo.
 */
export function buildTatuadorCanonical(rawNames: Iterable<string>): Map<string, string> {
  const oficiais = new Set(TATUADORES.map((t) => normalizeTatuador(t)));

  // unique e não vazios (preserva a grafia original mais completa)
  const seen = new Map<string, string>(); // normalized → original (primeiro encontrado)
  for (const raw of rawNames) {
    const t = (raw || "").trim();
    if (!t) continue;
    const n = normalizeTatuador(t);
    if (!n) continue;
    if (!seen.has(n)) seen.set(n, t);
  }

  // Ordena por mais tokens primeiro (cabeças de cluster mais completas)
  const ordered = Array.from(seen.values()).sort((a, b) => {
    const ta = tokens(a).length;
    const tb = tokens(b).length;
    if (tb !== ta) return tb - ta;
    return b.length - a.length;
  });

  const clusters: Cluster[] = [];
  for (const name of ordered) {
    const tks = tokens(name);
    // Procura cluster cujos tokens tenham interseção compatível
    // (este nome é subset do cluster, ou cluster é subset deste)
    let merged: Cluster | null = null;
    for (const c of clusters) {
      if (isSubset(tks, c.tokenSet) || isSubset(c.tokenSet, tks)) {
        merged = c;
        break;
      }
    }
    if (merged) {
      merged.names.push(name);
      for (const t of tks) if (!merged.tokenSet.includes(t)) merged.tokenSet.push(t);
    } else {
      clusters.push({ names: [name], tokenSet: [...tks] });
    }
  }

  const pickCanonical = (c: Cluster): string => {
    // 1) Nome que bate exatamente com a lista oficial
    const oficial = c.names.find((n) => oficiais.has(normalizeTatuador(n)));
    if (oficial) {
      // devolve a grafia oficial (com acento/case correto)
      const idx = TATUADORES.findIndex((t) => normalizeTatuador(t) === normalizeTatuador(oficial));
      if (idx >= 0) return TATUADORES[idx];
      return oficial;
    }
    // 2) Mais tokens → mais longo → melhor capitalização (tem maiúscula)
    return [...c.names].sort((a, b) => {
      const ta = tokens(a).length;
      const tb = tokens(b).length;
      if (tb !== ta) return tb - ta;
      if (b.length !== a.length) return b.length - a.length;
      const ca = /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(a) ? 1 : 0;
      const cb = /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(b) ? 1 : 0;
      return cb - ca;
    })[0];
  };

  // Mapa normalized → canonical (para qualquer grafia bruta)
  const normToCanonical = new Map<string, string>();
  const map = new Map<string, string>();
  for (const c of clusters) {
    const canonical = pickCanonical(c);
    for (const n of c.names) {
      map.set(n, canonical);
      normToCanonical.set(normalizeTatuador(n), canonical);
    }
  }
  // Anexa também a forma normalizada como chave para lookup tolerante a case/acento
  for (const [norm, canon] of normToCanonical) {
    if (!map.has(norm)) map.set(`__norm__:${norm}`, canon);
  }
  return map;
}

/**
 * Helper conveniente: recebe os nomes brutos + um nome específico e
 * retorna a forma canonical (ou o próprio nome se não houver agrupamento).
 * Tolerante a diferenças de capitalização e acentuação.
 */
export function canonicalOf(map: Map<string, string>, raw: string | null | undefined): string {
  const t = (raw || "").trim();
  if (!t) return "";
  const direct = map.get(t);
  if (direct) return direct;
  const norm = normalizeTatuador(t);
  return map.get(`__norm__:${norm}`) ?? t;
}
