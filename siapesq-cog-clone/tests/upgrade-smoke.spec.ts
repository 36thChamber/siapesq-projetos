import { expect, test } from "@playwright/test";

const fixture = { id_usuario: "fixture", nome: "Fixture", email: "fixture@example.test", tipo_usuario: "PESQUISADOR" };
test.beforeEach(async ({ page }) => {
  // All API responses are fixtures, including unknown paths; no live account/API writes.
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") return route.fulfill({ json: fixture });
    if (path === "/api/especies/fixture") return route.fulfill({ json: { id_especie: "fixture", nome_cientifico: "Fixture species", nome: "Fixture species" } });
    if (path.endsWith("/ocorrencias")) return route.fulfill({ status: 404, json: { message: "No fixture occurrences" } });
    return route.fulfill({ json: [] });
  });
  await page.route(/https:\/\/.*tile\.openstreetmap\.org\//, route => route.abort());
});

test("React 19 and Leaflet 5 mount the dynamic map route", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto("/map/fixture");
  expect(response?.status()).toBe(200);
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page).toHaveURL(/\/map\/fixture$/);
  expect(errors).toEqual([]);
});

test("dynamic group params render without Promise access errors", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto("/group/fixture");
  expect(response?.status()).toBe(200);
  await expect(page.getByText("Selecione uma espécie para visualizar")).toBeVisible();
  expect(errors).toEqual([]);
});

test("login remains usable at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
