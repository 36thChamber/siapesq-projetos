import React, { useEffect, useState } from "react";
import TableDynamic from "../components/atoms/tableDynamic";
import SideBar from "../components/atoms/sideBar";
import { Artigo, ArtigosPorEspecie } from "../controllers/types/artigos-types";
import { get_list_artigos } from "../controllers/artigos-controller";
import { agruparArtigosPorEspecie, visualizarArtigo } from "../utils/articles";

const Articles: React.FC = () => {
  const [grupos, setGrupos] = useState<ArtigosPorEspecie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function get_artigos() {
      const token = await window.auth.getToken();
      if (!token) return;

      try {
        const response = await get_list_artigos(token, {
          limit: 1000,
          offset: 0,
        });

        const artigos: Artigo[] = response.artigos;
        const agrupados = agruparArtigosPorEspecie(artigos);

        setGrupos(agrupados);
      } catch (error) {
        console.error("erro ao carregar artigos", error);
      } finally {
        setLoading(false);
      }
    }

    get_artigos();
  }, []);

  if (loading) {
    return <div className="p-10">Carregando artigos...</div>;
  }

  return (
    <div className="bg-dark_gray">
      {/* SIDEBAR FIXA */}
      <aside className="fixed top-0 left-0 h-screen w-60 z-50">
        <SideBar />
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main
        className="
          ml-60
          h-screen
          overflow-y-auto
          bg-light_green/40
          px-10
          py-8
        "
      >
        <h1 className="text-2xl font-semibold text-dark_green mb-6">
          Artigos fontes
        </h1>

        <div className="space-y-6">
          {grupos.map((grupo) => (
            <section
              key={grupo.id_especie}
              className="bg-white rounded-lg border border-light_green overflow-hidden"
            >
              <header className="flex items-center justify-between bg-dark_green text-light_green px-4 py-3">
                <span className="font-medium">
                  Espécie: {grupo.nome_especie}
                </span>
              </header>

              <div className="bg-light_green/15 px-6 py-4">
                <TableDynamic
                  columns={[
                    {
                      key: "titulo",
                      header: "",
                      align: "left",
                      width: "70%",
                    },
                    {
                      key: "acao",
                      header: "",
                      align: "right",
                      width: "30%",
                    },
                  ]}
                  data={grupo.artigos.map((artigo) => ({
                    titulo: (
                      <div className="flex flex-col">
                        <span className="font-medium text-dark_green">
                          {artigo.nome_artigo}
                        </span>

                        <span className="text-xs text-gray-500 italic">
                          {artigo.referencia_texto}
                        </span>
                      </div>
                    ),
                    acao: (
                      <button
                        type="button"
                        className="flex items-center justify-center gap-1 bg-light_green text-dark_green px-3 py-1 rounded text-sm font-medium"
                        onClick={() => visualizarArtigo(artigo.artigo)}
                      >
                        <span className="material-icons-outlined text-base">
                          Visualizar
                        </span>
                      </button>
                    ),
                  }))}
                  striped={false}
                  bordered={false}
                  hoverable={false}
                  className="bg-transparent"
                />
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Articles;
