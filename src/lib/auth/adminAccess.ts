import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logSecure } from "@/lib/logger";

type AdminAccessState = "authorized" | "forbidden" | "unauthenticated" | "error";

export interface AdminAccessResult {
  state: AdminAccessState;
  session: Session | null;
  userId: string | null;
}

function partialUid(uid: string | null | undefined): string | null {
  if (!uid) return null;
  return `${uid.slice(0, 8)}...`;
}

function sanitizeError(error: unknown) {
  if (!error || typeof error !== "object") return { message: "unknown" };
  const candidate = error as {
    code?: string;
    message?: string;
    name?: string;
    status?: number;
    statusCode?: number;
  };
  return {
    code: candidate.code ?? null,
    message: candidate.message ?? "unknown",
    name: candidate.name ?? null,
    status: candidate.status ?? candidate.statusCode ?? null,
  };
}

function debugAdminAccess(message: string, meta?: Record<string, unknown>) {
  logSecure("debug", `[admin-access] ${message}`, meta);
}

export async function resolveAdminAccess(session: Session | null): Promise<AdminAccessResult> {
  const uid = session?.user?.id ?? null;

  debugAdminAccess("authenticated user resolved", {
    authenticated: Boolean(uid),
    uid: partialUid(uid),
  });

  if (!uid) {
    return {
      state: "unauthenticated",
      session,
      userId: null,
    };
  }

  debugAdminAccess("has_role called", {
    uid: partialUid(uid),
    role: "admin",
  });

  const { data: isAdmin, error } = await supabase.rpc("has_role", {
    _user_id: uid,
    _role: "admin",
  });

  if (error) {
    debugAdminAccess("has_role error", {
      uid: partialUid(uid),
      error: sanitizeError(error),
    });
    return {
      state: "error",
      session,
      userId: uid,
    };
  }

  debugAdminAccess("has_role result", {
    uid: partialUid(uid),
    isAdmin: isAdmin === true,
  });

  return {
    state: isAdmin === true ? "authorized" : "forbidden",
    session,
    userId: uid,
  };
}

export async function resolveCurrentAdminAccess(): Promise<AdminAccessResult> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user?.id) {
    debugAdminAccess("session unavailable", {
      authenticated: false,
      uid: partialUid(session?.user?.id),
      error: error ? sanitizeError(error) : null,
    });
    return {
      state: "unauthenticated",
      session: session ?? null,
      userId: null,
    };
  }

  return resolveAdminAccess(session);
}
