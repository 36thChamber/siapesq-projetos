import { test, expect } from '@playwright/test';

test('Home sem sessão exige login', async ({page}) => {
  await page.route('**/api/**', route=>route.fulfill({status:401,json:{message:'Sem sessão'}}));
  await page.goto('/home'); await expect(page).toHaveURL(/\/login$/);
});
test('login monta a Home sem chamadas repetidas de grupos', async ({page}) => {
  let authenticated=false,groups=0;
  await page.route('**/api/**', route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/auth/login')authenticated=true;
    if(path==='/api/auth/me'||path==='/api/auth/login')return route.fulfill({status:authenticated?200:401,json:authenticated?{id_usuario:'home-fixture',nome:'Fixture',email:'fixture@example.test',tipo_usuario:'PADRAO'}:{message:'Sem sessão'}});
    if(path==='/api/gruposEspecies')groups++;
    return route.fulfill({json:[]});
  });
  await page.route('https://api.gbif.org/**', route=>route.fulfill({json:{}}));
  await page.goto('/login'); await page.locator('#login-email').fill('fixture@example.test');await page.locator('#login-password').fill('fixture-password');await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/home$/);await expect(page.locator('main')).toBeVisible();
  expect(groups).toBeLessThanOrEqual(2);
});
test('recarregar Home preserva a rota autenticada', async ({page}) => {
  await page.route('**/api/**', route=>route.fulfill({json:new URL(route.request().url()).pathname==='/api/auth/me'?{id_usuario:'home-fixture',nome:'Fixture',tipo_usuario:'PADRAO'}:[]}));
  await page.route('https://api.gbif.org/**', route=>route.fulfill({json:{}}));
  await page.goto('/home');await expect(page.locator('main')).toBeVisible();await page.reload();await expect(page).toHaveURL(/\/home$/);await expect(page.locator('main')).toBeVisible();
});
