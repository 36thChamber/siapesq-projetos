import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import AccountAction from "./AccountAction";
import { resetPassword, verificarEmail } from "@/services/api/usuarios.service";
vi.mock("@/services/api/usuarios.service", () => ({ resetPassword: vi.fn(), verificarEmail: vi.fn() }));
vi.mock("next/link", () => ({ default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));
beforeEach(() => { vi.clearAllMocks(); window.history.replaceState(null, "", "/"); });

it("consumes a fragment token once under StrictMode and removes it from the address", async () => {
  window.history.replaceState(null, "", "/verify-email#token=private-fixture");
  vi.mocked(verificarEmail).mockResolvedValue();
  render(<StrictMode><AccountAction mode="verify" /></StrictMode>);
  await screen.findByText(/E-mail confirmado/);
  expect(verificarEmail).toHaveBeenCalledExactlyOnceWith({ token: "private-fixture" });
  expect(window.location.hash).toBe("");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("validates password confirmation before submitting the reset token", async () => {
  window.history.replaceState(null, "", "/reset-password#token=reset-fixture");
  vi.mocked(resetPassword).mockResolvedValue();
  render(<StrictMode><AccountAction mode="reset" /></StrictMode>);
  fireEvent.change(await screen.findByLabelText("Nova senha"), { target: { value: "new-password" } });
  fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "different" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
  expect(resetPassword).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "new-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
  await waitFor(() => expect(resetPassword).toHaveBeenCalledWith({ token: "reset-fixture", novaSenha: "new-password" }));
});
