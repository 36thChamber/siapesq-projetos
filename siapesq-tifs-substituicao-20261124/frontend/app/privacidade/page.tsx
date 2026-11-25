"use client";
import Link from "next/link";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export default function PrivacyPage(){
  return <div className="flex min-h-screen flex-col bg-slate-50">
    <Header />
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-5 py-10 text-slate-800">
      <h1 className="text-2xl font-bold">Privacidade na plataforma</h1>
      <p>Veja como a plataforma SIAPESQ utiliza os dados de cadastro e controla o acesso aos comprovantes científicos.</p>
      <section className="space-y-2"><h2 className="text-lg font-semibold">Dados armazenados</h2><p>O cadastro pode registrar nome, e-mail, CPF, contato, currículo Lattes e a declaração de título científico. O perfil pode conter um comprovante enviado por você. Senhas são armazenadas como hashes; a sessão usa um cookie HttpOnly.</p></section>
      <section className="space-y-2"><h2 className="text-lg font-semibold">Comprovantes e acesso</h2><p>O comprovante atual fica no banco privado da plataforma. O próprio usuário e a administração podem consultá-lo e baixá-lo. O limite é de 5 MB por arquivo, nos formatos PDF, PNG ou JPEG. A substituição troca o documento atual; cópias privadas de segurança do ambiente podem conservar dados anteriores.</p></section>
      <section className="space-y-2"><h2 className="text-lg font-semibold">E-mails e pagamentos</h2><p>Os links de confirmação e recuperação são enviados ao endereço cadastrado. O pagamento segue o fluxo do provedor selecionado no checkout.</p></section>
      <section className="space-y-2"><h2 className="text-lg font-semibold">Mapas e imagens</h2><p>A navegação pode consultar GBIF, OpenStreetMap, Google e o armazenamento S3 para exibir mapas e imagens. As imagens licenciadas possuem créditos e links para as fontes. Os arquivos privados são disponibilizados por links temporários autorizados pelo servidor.</p></section>
      <section className="space-y-2"><h2 className="text-lg font-semibold">Dúvidas sobre os dados</h2><p>Consulte a <Link href="/faq" className="text-sky-800 underline">ajuda da plataforma</Link> ou entre em contato pela página Sobre a SIAPESQ.</p></section>
    </main>
    <Footer />
  </div>;
}
