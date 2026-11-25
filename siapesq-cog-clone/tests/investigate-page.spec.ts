import { test, expect, Page } from '@playwright/test';

async function mockSession(page: Page, authenticated: boolean) {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/login') authenticated = true;
    if (path === '/api/auth/me' || path === '/api/auth/login') return route.fulfill({status: authenticated ? 200 : 401, json: authenticated ? {id_usuario:'redirect-fixture',nome:'Fixture',email:'fixture@example.test',tipo_usuario:'PADRAO'} : {message:'Sem sessão'}});
    return route.fulfill({json:[]});
  });
  await page.route('https://api.gbif.org/**', route => route.fulfill({json:{}}));
}

test('acesso inicial sem sessão abre o login', async ({page}) => {
  await mockSession(page,false); await page.goto('/'); await expect(page).toHaveURL(/\/login$/);
});
test('acesso inicial com sessão abre a Home', async ({page}) => {
  await mockSession(page,true); await page.goto('/'); await expect(page).toHaveURL(/\/home$/);
});
test('recarregar mantém a sessão e a Home', async ({page}) => {
  await mockSession(page,true); await page.goto('/'); await expect(page).toHaveURL(/\/home$/); await page.reload(); await expect(page).toHaveURL(/\/home$/);
});
