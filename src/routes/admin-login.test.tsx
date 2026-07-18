import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminLoginPage from "./admin-login";

const {
  mockSignInWithPassword,
  mockSignOut,
  mockRpc,
  mockUseAuth,
  mockCheckAdminAccess,
  mockToastSuccess,
  mockFrom,
} = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockRpc: vi.fn(),
  mockUseAuth: vi.fn(),
  mockCheckAdminAccess: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
    rpc: mockRpc,
    from: mockFrom,
  },
}));

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/lib/auth/adminAccess", () => ({
  checkAdminAccess: mockCheckAdminAccess,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
  },
}));

function renderLogin(initialPath = "/admin-login") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/admin/*" element={<div>painel</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminLoginPage", () => {
  beforeEach(() => {
    mockSignInWithPassword.mockReset();
    mockSignOut.mockReset();
    mockRpc.mockReset();
    mockUseAuth.mockReset();
    mockCheckAdminAccess.mockReset();
    mockToastSuccess.mockReset();
    mockFrom.mockReset();

    mockUseAuth.mockReturnValue({
      authLoading: false,
      status: "unauthenticated",
      isAdmin: false,
      adminLoading: false,
    });

    mockRpc.mockImplementation((fn: string) => {
      if (fn === "check_login_lockout") {
        return Promise.resolve({ data: { locked: false }, error: null });
      }
      if (fn === "record_login_attempt") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  it("credencial invalida nao cria acesso e nao consulta role", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "invalid login credentials" },
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha-errada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(
        screen.getByText("Nao foi possivel entrar. Verifique as credenciais e tente novamente."),
      ).toBeInTheDocument();
    });

    expect(mockCheckAdminAccess).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("next valido redireciona corretamente", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockCheckAdminAccess.mockResolvedValue({
      authenticated: true,
      authorized: true,
      user: { id: "422da300-867e-48c3-9e4c-4784ae1f8645" },
      error: null,
    });

    renderLogin("/admin-login?next=%2Fadmin%2Fclientes");

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha-correta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByText("painel")).toBeInTheDocument();
    });
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it("next externo e bloqueado", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockCheckAdminAccess.mockResolvedValue({
      authenticated: true,
      authorized: true,
      user: { id: "422da300-867e-48c3-9e4c-4784ae1f8645" },
      error: null,
    });

    renderLogin("/admin-login?next=https%3A%2F%2Fevil.example");

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha-correta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByText("painel")).toBeInTheDocument();
    });
    expect(mockToastSuccess).toHaveBeenCalled();
  });

  it("erro do rpc encerra a sessao e bloqueia acesso", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockCheckAdminAccess.mockResolvedValue({
      authenticated: true,
      authorized: false,
      user: { id: "422da300-867e-48c3-9e4c-4784ae1f8645" },
      error: "Nao foi possivel validar o acesso administrativo. Tente novamente.",
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha-correta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(
        screen.getByText("Nao foi possivel validar o acesso administrativo. Tente novamente."),
      ).toBeInTheDocument();
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("dois cliques nao criam duas submisses", async () => {
    let resolveSignIn!: (value: { error: null }) => void;
    mockSignInWithPassword.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    renderLogin();

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "senha-correta" },
    });

    const button = screen.getByRole("button", { name: "Entrar" });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
    });

    mockCheckAdminAccess.mockResolvedValue({
      authenticated: true,
      authorized: true,
      user: { id: "422da300-867e-48c3-9e4c-4784ae1f8645" },
      error: null,
    });
    resolveSignIn({ error: null });

    await waitFor(() => {
      expect(screen.getByText("painel")).toBeInTheDocument();
    });
  });
});
