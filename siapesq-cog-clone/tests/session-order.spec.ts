import { expect, test } from "@playwright/test";

test("a stale session response cannot discard a successful login", async ({ page }) => {
  const user = { id_usuario: "session-order-fixture", nome: "Pesquisador", email: "fixture@example.test", tipo_usuario: "PESQUISADOR" };
  let release: () => void = () => {};
  const pendingRestore = new Promise<void>(resolve => { release = resolve; });
  let started: () => void = () => {};
  const restoreStarted = new Promise<void>(resolve => { started = resolve; });
  let first = true;
  await page.route("**/api/**", async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/me" && first) {
      first = false; started(); await pendingRestore;
      return route.fulfill({ status: 401, json: { message: "Old session check" } });
    }
    if (pathname === "/api/auth/login" || pathname === "/api/auth/me") return route.fulfill({ json: user });
    return route.fulfill({ json: [] });
  });
  await page.goto("/login"); await restoreStarted;
  await page.locator("#login-email").fill(user.email);
  await page.locator("#login-password").fill("Fixture-password-123");
  const login = page.waitForResponse(r => new URL(r.url()).pathname === "/api/auth/login");
  await page.getByRole("button", { name: "Entrar", exact: true }).click(); await login;
  const oldResponse = page.waitForResponse(r => new URL(r.url()).pathname === "/api/auth/me" && r.status() === 401);
  release(); await oldResponse;
  await expect(page.getByRole("button", { name: /Olá Pesquisador/ })).toBeVisible();
  await expect(page).toHaveURL(/\/home$/);
});
