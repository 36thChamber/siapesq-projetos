import { expect, test } from "@playwright/test";
test.beforeEach(async({page})=>{
  await page.route("**/api/**",route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname==="/api/auth/me")return route.fulfill({json:{id_usuario:"fixture",nome:"Fixture",tipo_usuario:"PESQUISADOR"}});
    if(pathname==="/api/especies/fixture")return route.fulfill({json:{id_especie:"fixture",nome:"Fixture species",nome_cientifico:"Fixture species"}});
    if(pathname.endsWith("/ocorrencias"))return route.fulfill({status:404,json:{message:"No fixture occurrences"}});
    return route.fulfill({json:[]});
  });
  await page.route(/https:\/\/.*tile\.openstreetmap\.org\//,route=>route.abort());
});
test("mobile map keeps the full viewport when the analysis drawer opens",async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto("/map/fixture");const map=page.locator(".leaflet-container");await expect(map).toBeVisible();
  expect((await map.boundingBox())!.width).toBeGreaterThanOrEqual(380);
  await page.getByRole("button",{name:"Abrir painel",exact:true}).click();await expect(page.getByRole("button",{name:"Fechar painel",exact:true})).toBeVisible();
  expect((await map.boundingBox())!.width).toBeGreaterThanOrEqual(380);
  await page.getByRole("button",{name:"Fechar painel",exact:true}).click();await expect(page.getByRole("button",{name:"Abrir painel",exact:true})).toBeVisible();
});
test("contact cards stay inside the desktop viewport",async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto("/sobre-siapesq");
  const title=page.getByRole("heading",{name:"Laboratórios",exact:true});await expect(title).toBeVisible();const bounds=await title.boundingBox();expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(1440);
});
test("footer privacy link opens an actual information page",async({page})=>{
  await page.goto("/faq");await page.getByRole("link",{name:"Privacidade",exact:true}).click();await expect(page).toHaveURL(/\/privacidade$/);
  await expect(page.getByRole("heading",{name:"Privacidade na plataforma"})).toBeVisible();expect(await page.locator('a[href="#"]').count()).toBe(0);
});
