"use client";
import Link from "next/link";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function PrivacyPage(){
  return <div className="flex min-h-screen flex-col bg-slate-50">
    <Header />
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-5 py-10 text-slate-800">
      <h1 className="text-2xl font-bold">Privacidade no ambiente de testes</h1>
      <p>Estas informações descrevem o clone de demonstração do SIAPESQ. Utilize dados fictícios ao explorar o cadastro, o perfil e o envio de comprovantes.</p>
      <section className="space-y-2"><h2 className="text-lg font-semibold">Dados armazenados</h2><p>O cadastro pode registrar nome, e-mail, CPF, contato, currículo Lattes e a declaração de título científico. O perfil pode conter um comprovante enviado por você. Senhas são armazenadas como hashes; a sessão usa um cookie HttpOnly.</p></section>
      <section className="space-y-2"><h2 className="text-lg font-semibold">Comprovantes e acesso</h2><p>O comprovante atual fica no banco privado do clone. O próprio usuário e a administração podem consultá-lo e baixá-lo. O limite é de 5 MB por arquivo, nos formatos PDF, PNG ou JPEG. A substituição troca o documento atual; cópias privadas de segurança do ambiente podem conservar dados anteriores.</p></section>
      <section className="space-y-2"><h2 className="text-lg font-semibold">E-mails e pagamentos</h2><p>Os e-mails de confirmação e recuperação ficam capturados no ambiente e podem ser consultados pela administração. Não há entrega externa de e-mails neste perfil. Cartão, Pix e boleto usam simulações identificadas na tela; nenhum pagamento real é processado.</p></section>
      <section className="space-y-2"><h2 className="text-lg font-semibold">Mapas e imagens</h2><p>A navegação pode consultar GBIF, OpenStreetMap, Google e o armazenamento S3 para exibir mapas e imagens. As imagens licenciadas possuem créditos e links para as fontes. Os arquivos privados são disponibilizados por links temporários autorizados pelo servidor.</p></section>
      <section className="space-y-2"><h2 className="text-lg font-semibold">Dúvidas sobre o teste</h2><p>O envio externo de mensagens está desativado no clone. Consulte a <Link href="/faq" className="text-sky-800 underline">ajuda da plataforma</Link> ou fale com a pessoa responsável pela demonstração para tratar dos dados usados no teste.</p></section>
    </main>
    <Footer />
  </div>;
}
