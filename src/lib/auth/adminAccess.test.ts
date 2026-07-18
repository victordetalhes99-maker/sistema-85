import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession, mockRpc } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
    rpc: mockRpc,
  },
}));

import { resolveAdminAccess, resolveCurrentAdminAccess } from "./adminAccess";

const session = {
  access_token: "token",
  refresh_token: "refresh",
  expires_in: 3600,
  expires_at: 9999999999,
  token_type: "bearer",
  user: {
    id: "422da300-867e-48c3-9e4c-4784ae1f8645",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-07-18T00:00:00.000Z",
  },
};

describe("adminAccess", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockRpc.mockReset();
  });

  it("bloqueia usuario sem sessao", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(resolveCurrentAdminAccess()).resolves.toMatchObject({
      state: "unauthenticated",
      userId: null,
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("usa session.user.id e rpc has_role com role admin", async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    await expect(
      resolveAdminAccess(session as Parameters<typeof resolveAdminAccess>[0]),
    ).resolves.toMatchObject({
      state: "authorized",
      userId: "422da300-867e-48c3-9e4c-4784ae1f8645",
    });

    expect(mockRpc).toHaveBeenCalledWith("has_role", {
      _user_id: "422da300-867e-48c3-9e4c-4784ae1f8645",
      _role: "admin",
    });
  });

  it("nao libera acesso quando o rpc retorna false", async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    await expect(
      resolveAdminAccess(session as Parameters<typeof resolveAdminAccess>[0]),
    ).resolves.toMatchObject({
      state: "forbidden",
    });
  });

  it("nao libera acesso quando o rpc falha", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "permission denied", code: "42501" },
    });

    await expect(
      resolveAdminAccess(session as Parameters<typeof resolveAdminAccess>[0]),
    ).resolves.toMatchObject({
      state: "error",
    });
  });

  it("sessao expirada nao libera acesso", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: "session expired" },
    });

    await expect(resolveCurrentAdminAccess()).resolves.toMatchObject({
      state: "unauthenticated",
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
