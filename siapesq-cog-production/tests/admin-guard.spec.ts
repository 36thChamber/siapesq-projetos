import { expect, test, type Page } from "@playwright/test";

type UserRole = "PADRAO" | "PESQUISADOR" | "ADMIN";

const apiBaseUrl = "https://api.example.invalid";

function userFor(role: UserRole) {
  return {
    id_usuario: `user-${role.toLowerCase()}`,
    nome: `Usuário ${role}`,
    email: `${role.toLowerCase()}@example.com`,
    tipo_usuario: role,
  };
}

async function mockAuthenticatedSession(page: Page, role: UserRole) {
  const user = userFor(role);
  const sessionToken = `token-${role.toLowerCase()}`;

  // Injeta cookie de sessão HttpOnly para o BFF
  await page.context().addCookies([
    {
      name: "siapesq_session",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "siapesq_session",
      value: sessionToken,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const refreshHandler = async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    });
  };

  await page.route(`**/api/auth/me*`, refreshHandler);

  const assinaturasHandler = async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  };

  await page.route(`**/api/assinaturas/usuario/**`, assinaturasHandler);
  await page.route(`${apiBaseUrl}/assinaturas/usuario/**`, assinaturasHandler);
}

function trackAdministrativeRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    const requestStartedOnAdmin = new URL(page.url()).pathname === "/admin";
    const isDirectApi = url.origin === apiBaseUrl;
    const isBffApi = url.pathname.startsWith("/api/");

    if (
      requestStartedOnAdmin &&
      (isDirectApi &&
        (url.pathname === "/usuarios/" ||
          url.pathname === "/usuarios" ||
          url.pathname === "/especies")) ||
      (isBffApi &&
        (url.pathname === "/api/usuarios/" ||
          url.pathname === "/api/usuarios" ||
          url.pathname === "/api/especies"))
    ) {
      requests.push(url.pathname);
    }
  });

  return requests;
}

test.describe("Issue #224 - guard do painel administrativo", () => {
  test("redireciona sessão ausente para o login", async ({ page }) => {
    const administrativeRequests = trackAdministrativeRequests(page);

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Lista de Usuários")).toHaveCount(0);
    expect(administrativeRequests).toEqual([]);
  });

  for (const role of ["PADRAO", "PESQUISADOR"] as const) {
    test(`bloqueia usuário ${role} sem disparar hooks administrativos`, async ({ page }) => {
      await mockAuthenticatedSession(page, role);
      const administrativeRequests = trackAdministrativeRequests(page);

      await page.goto("/admin");

      await expect(page).not.toHaveURL(/\/admin$/);
      await expect(page.getByText("Lista de Usuários")).toHaveCount(0);
      expect(administrativeRequests).toEqual([]);
    });
  }

  test("mantém usuário ADMIN no painel e carrega a seção administrativa", async ({ page }) => {
    await mockAuthenticatedSession(page, "ADMIN");
    const administrativeRequests = trackAdministrativeRequests(page);

    const usuariosHandler = async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    };

    await page.route(`**/api/usuarios/`, usuariosHandler);
    await page.route(`**/api/usuarios`, usuariosHandler);
    await page.route(`${apiBaseUrl}/usuarios/`, usuariosHandler);
    await page.route(`${apiBaseUrl}/usuarios`, usuariosHandler);

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("Lista de Usuários")).toBeVisible();
    await expect.poll(() => administrativeRequests.length).toBeGreaterThan(0);
  });
});
