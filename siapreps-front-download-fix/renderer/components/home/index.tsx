import { useState, useEffect } from "react";
import Image from "next/image";
import CardInfo from "../atoms/cardInfo";
import SideBar from "../atoms/sideBar";

export default function HomePage() {

  const [atualizacaoData, setAtualizacaoData] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await window.auth.getAtualizacaoData();
        if (data) {
          setAtualizacaoData(
            new Date(data).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            })
          );
        }
      } catch (err) {
        console.error("Erro ao buscar data:", err);
      }
    };
    fetchData();
  }, []);
  
  return (
    <div className="flex min-h-screen max-md:flex-col">
      {/* Sidebar fixa */}
      <SideBar />

      {/* Conteúdo: centralizado e limitado em largura */}
      <main className="flex-1 flex justify-center px-6 py-10 main-home">
        <div className="w-full max-w-5xl space-y-4 main-content">
          {/* Cabeçalho */}
          <section className="space-y-2">
            <h1 className="text-3xl font-bold">
              Plataforma SIAPESQ - STE - Hubbitat
            </h1>
            <p className="leading-relaxed">
              A plataforma SIAPESQ é um software de inteligência artificial
              pioneiro dedicado ao monitoramento ambiental, com foco inicial nos
              primatas do Rio Grande do Sul. Ela integra ciência de dados,
              análise preditiva e comunicação inteligente para oferecer mapas
              interativos e modelos ecológicos que permitem compreender e
              antecipar padrões ambientais em múltiplos cenários climáticos.
            </p>
          </section>

          {/* Cards */}
          <section className="flex flex-wrap gap-4">
            <CardInfo
              icon_top={"/images/icons/mapActivity.svg"}
              text={`Última atualização:  ${
                atualizacaoData ? atualizacaoData : "Não realizada"
              }`}
              // ocupa linha inteira no mobile, largura fixa em telas >= sm
              style="bg-white shadow-md rounded-xl w-full sm:w-[250px] max-lg:mx-auto"
            />
            <CardInfo
              icon_top={"/images/icons/mapPointer.svg"}
              text={"Número de ocorrências registradas: 8.836"}
              style="bg-white shadow-md rounded-xl w-full sm:w-[250px] max-lg:mx-auto"
            />
          </section>

          {/* Espécies monitoradas */}
          <section className="space-y-2 max-w-4xl">
            <h3 className="text-2xl font-bold max-lg:text-center">
              Espécies monitoradas
            </h3>

            <div className="flex gap-6 max-lg:flex-col max-lg:items-center max-lg:overflow-y-auto">
              <img
                src="/images/bugio_ruivo.svg"
                alt="Bugio Ruivo"
                className="h-50 w-50 object-contain max-lg:h-60 max-lg:w-60"
              />
              <img
                src="/images/bugio_preto.svg"
                alt="Bugio Preto"
                className="h-50 w-50 object-contain max-lg:h-60 max-lg:w-60"
              />
              <img
                src="/images/macaco_prego.svg"
                alt="Macaco Prego"
                className="h-50 w-50 object-contain max-lg:h-60 max-lg:w-60"
              />
            </div>
          </section>

          <footer className="fixed bottom-4 right-2 z-10 flex">
            <Image
              src="/images/logos/hubittat.svg"
              width={150}
              height={150}
              alt="Logo da Hubittat"
            />
            <Image
              src="/images/logos/ste.svg"
              width={150}
              height={150}
              alt="Logo da STE"
            />
          </footer>
        </div>
      </main>
    </div>
  );
}
