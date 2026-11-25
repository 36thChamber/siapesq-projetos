// Real clone flows: one synthetic registration per engine; mail and payments stay simulated.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const review = require('./browser-validation.cjs');
async function main() {
  const { cfg, origin, options } = review.environment(), browser = await review.launch();
  const context = await browser.newContext(options), admin = await browser.newContext(options), page = await context.newPage();
  const errors = [], failedRequests = [], responseStatus = []; page.on('pageerror', e => errors.push({ name: e.name, message: e.message.replace(/https?:\/\/\S+/g, '[URL]'), stack: e.stack?.replace(/https?:\/\/\S+/g, '[URL]').slice(0, 700) }));
  page.on('requestfailed', request => { const url = new URL(request.url()); if (url.origin === origin) failedRequests.push({ path: url.pathname, error: request.failure()?.errorText }); });
  page.on('response', response => { const url = new URL(response.url()); if (url.origin === origin && (url.searchParams.has('_rsc') || response.status() >= 400)) responseStatus.push({ path: url.pathname, status: response.status() }); });
  const reportFile = review.artifact(path.resolve(__dirname, '../artifacts/content/account-checkout-browser.json'));
  if (fs.existsSync(reportFile)) fs.unlinkSync(reportFile);
  page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(45000);
  const email = `compatibility-${review.engine}-${Date.now()}@example.com`, password = crypto.randomBytes(20).toString('base64url'), replacement = crypto.randomBytes(20).toString('base64url');
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj <<>> endobj\n%%EOF\n'), png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  const cpf = Array.from({ length: 9 }, () => crypto.randomInt(0, 10));
  for (let count = 9; count <= 10; count++) { const sum = cpf.reduce((n, d, i) => n + d * (count + 1 - i), 0), digit = 11 - sum % 11; cpf.push(digit >= 10 ? 0 : digit); }
  const headers = { Origin: origin }; let stage = 'admin_login';
  async function mailLink(part) {
    const response = await admin.request.get(origin + '/api/homologacao/emails'); assert.equal(response.status(), 200);
    const message = (await response.json()).messages.find(m => m.to === email && m.links.some(link => new URL(link).pathname === part));
    assert(message, 'Captured test mail missing'); return message.links.find(link => new URL(link).pathname === part);
  }
  try {
    const adminLogin = await admin.request.post(origin + '/api/auth/login', { headers, data: { email: cfg.adminAccount.email, senha: cfg.adminAccount.password } }); assert.equal(adminLogin.status(), 200);
    stage = 'register_pdf';
    const restored = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/me'); await page.goto(origin + '/register'); await restored;
    for (const [id, value] of [['register-nome', 'Compatibilidade ' + review.engine], ['register-email', email], ['register-senha', password], ['register-confirmar-senha', password], ['register-cpf', cpf.join('')]]) await page.locator('#' + id).fill(value);
    await page.locator('#titulo_cientifico').check(); await page.locator('#cert_cientifico').setInputFiles({ name: 'diploma.pdf', mimeType: 'application/pdf', buffer: pdf });
    const signup = page.waitForResponse(r => new URL(r.url()).pathname === '/api/usuarios' && r.request().method() === 'POST'); await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
    const registered = await signup; assert.equal(registered.status(), 201); const user = await registered.json();
    stage = 'confirm_email'; await page.goto(await mailLink('/verify-email')); await page.getByText(/E-mail confirmado/).waitFor(); assert.equal(new URL(page.url()).hash, '');
    stage = 'recover_password';
    await page.goto(origin + '/login'); await page.getByRole('button', { name: 'Esqueci minha senha', exact: false }).click(); await page.getByPlaceholder('E-mail', { exact: true }).fill(email);
    const recovery = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/forgot-password')); await page.getByRole('button', { name: 'Enviar', exact: true }).click(); assert.equal((await recovery).status(), 200);
    await page.goto(await mailLink('/reset-password')); await page.getByLabel('Nova senha', { exact: true }).fill(replacement); await page.getByLabel('Confirmar nova senha').fill(replacement);
    await page.getByRole('button', { name: 'Salvar nova senha' }).click(); await page.getByText(/Senha atualizada/).waitFor(); assert.equal(new URL(page.url()).hash, '');
    stage = 'login_form';
    await page.goto(origin + '/login'); await page.locator('#login-email').fill(email); await page.locator('#login-password').fill(replacement);
    const homeData = Promise.all(['/api/gruposEspecies', '/api/analises/dados_plataforma'].map(pathname => page.waitForResponse(r => new URL(r.url()).pathname === pathname && r.status() === 200).then(r => r.finished())));
    const logged = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/login'); await page.getByRole('button', { name: 'Entrar', exact: true }).click(); assert.equal((await logged).status(), 200); await page.waitForURL(url => url.pathname === '/home'); await homeData;
    stage = 'certificate_owner';
    await page.getByRole('button', { name: /Olá Compatibilidade/ }).click(); await page.getByRole('menuitem', { name: 'Perfil', exact: true }).click(); await page.waitForURL(url => url.pathname === '/profile'); const certificate = page.getByRole('region', { name: 'Comprovante científico' }); const original = certificate.getByRole('link', { name: 'Baixar diploma.pdf', exact: true }); await original.waitFor();
    const initial = await context.request.get(origin + await original.getAttribute('href')); assert.equal(initial.status(), 200); assert.deepEqual(await initial.body(), pdf);
    await certificate.getByLabel('Selecionar comprovante científico').setInputFiles({ name: 'atualizado.png', mimeType: 'image/png', buffer: png }); await certificate.getByRole('button', { name: 'Substituir comprovante', exact: true }).click();
    await certificate.getByRole('status').filter({ hasText: 'armazenado com sucesso' }).waitFor(); await page.reload(); await page.getByRole('link', { name: 'Baixar atualizado.png', exact: true }).waitFor();
    stage = 'certificate_admin';
    const adminPage = await admin.newPage(); adminPage.on('pageerror', e => errors.push(e.message.replace(/https?:\/\/\S+/g, '[URL]'))); await adminPage.goto(origin + '/admin');
    const row = adminPage.getByRole('row').filter({ hasText: email }); await row.waitFor(); await row.getByRole('button', { name: 'Documento', exact: true }).click(); await row.getByRole('link', { name: 'Baixar atualizado.png', exact: true }).waitFor();
    const download = await admin.request.get(origin + '/api/usuarios/' + user.id_usuario + '/comprovante/download'); assert.equal(download.status(), 200); assert.deepEqual(await download.body(), png);
    const stranger = await browser.newContext(options); await stranger.request.post(origin + '/api/auth/login', { headers, data: { email: cfg.account.email, senha: cfg.account.password } });
    assert.equal((await stranger.request.get(origin + '/api/usuarios/' + user.id_usuario + '/comprovante/download')).status(), 403); await stranger.close();
    stage = 'approval'; const approval = await admin.request.put(origin + '/api/admin/aprovar-usuario', { headers, data: { id_usuario: user.id_usuario, status: 'APROVADO' } }); assert.equal(approval.status(), 200);
    const payments = [];
    for (const [method, provider, outcome] of [['Pix', 'Mercado Pago', 'aprovado'], ['Cartão de crédito', 'Stripe', 'aprovado'], ['Boleto', 'Mercado Pago', 'recusado']]) {
      stage = 'payment_' + provider;
      await page.goto(origin + '/planos'); const heading = page.getByRole('heading', { name: method === 'Cartão de crédito' ? 'Teste de quota' : 'Teste anual · ilimitado', exact: true }); await heading.waitFor();
      await heading.locator('../..').getByRole('button').click(); await page.waitForURL(url => url.pathname === '/payment'); await page.getByText(method, { exact: true }).first().click();
      await page.getByRole('button', { name: /Finalizar|Confirmar|Contratar/i }).click(); await page.waitForURL(url => url.pathname.startsWith('/homologacao/pagamento/'));
      await page.getByText('Provedor simulado: ' + provider, { exact: true }).waitFor(); await page.getByText('Simulação · nenhum valor será cobrado', { exact: true }).waitFor();
      await page.getByRole('button', { name: outcome === 'aprovado' ? 'Simular aprovação' : 'Simular recusa', exact: true }).click(); await page.getByRole('status').filter({ hasText: 'Resultado: ' + outcome }).waitFor();
      payments.push({ method, provider, outcome });
    }
    assert.deepEqual(errors, []);
    const report = { status: 'passed', checkedAt: new Date().toISOString(), origin, engine: review.engine, browser: browser.version(), registration_with_pdf: true, email_confirmation_fragment_removed: true, password_recovery_and_reset: true, login_form_with_replacement_password: true, owner_document_exact_bytes: true, document_replacement_persists: true, administrator_document_exact_bytes: true, other_user_denied: true, payments, page_errors: errors };
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
  } catch (error) { const diagnostic = { stage, name: error.name, message: error.message.replace(/https?:\/\/\S+/g, '[URL]').slice(0, 650), page_errors: errors, failed_requests: failedRequests, responses: responseStatus }; fs.writeFileSync(review.artifact(path.resolve(__dirname, '../artifacts/content/account-checkout-failure.json')), JSON.stringify(diagnostic, null, 2) + '\n'); console.error(JSON.stringify(diagnostic)); process.exitCode = 1; }
  finally { await browser.close(); }
}
main().catch(e => { console.error({ name: e.name, message: e.message.replace(/https?:\/\/\S+/g, '[URL]').slice(0, 500) }); process.exitCode = 1; });
