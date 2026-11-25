import {test,expect} from '@playwright/test';

test('login anônimo permanece estável sem repetir restauração',async({page})=>{
 let restored=0;
 await page.route('**/api/**',route=>{if(new URL(route.request().url()).pathname==='/api/auth/me')restored++;return route.fulfill({status:401,json:{message:'Sem sessão'}})});
 await page.goto('/login');await expect(page.locator('#login-email')).toBeVisible();await expect(page).toHaveURL(/\/login$/);expect(restored).toBeLessThanOrEqual(1);
});
test('abrir login com sessão não causa navegação em ciclo',async({page})=>{
 let navigations=0;
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++});
 await page.route('**/api/**',route=>route.fulfill({json:new URL(route.request().url()).pathname==='/api/auth/me'?{id_usuario:'login-fixture',nome:'Fixture',tipo_usuario:'PADRAO'}:[]}));
 await page.goto('/login');await expect(page.locator('#login-email')).toBeVisible();await expect(page).toHaveURL(/\/login$/);expect(navigations).toBeLessThanOrEqual(2);
});
test('sessão expirada volta ao login e permite recarregar',async({page})=>{
 await page.route('**/api/**',route=>route.fulfill({status:401,json:{message:'Sessão expirada'}}));
 await page.goto('/home');await expect(page).toHaveURL(/\/login$/);await page.reload();await expect(page.locator('#login-password')).toBeVisible();await expect(page).toHaveURL(/\/login$/);
});
