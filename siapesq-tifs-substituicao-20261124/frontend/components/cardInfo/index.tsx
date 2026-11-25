"use client";

import { Especie as Specie } from "@/services/types/especie.types";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { listarArtigos } from "@/services/api/artigos.service";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import { processArticleReferences } from "@/utils/articleReferences";

type Props = {
  specie: Specie;
  images?: string[];
  details?: Specie;
  children?: React.ReactNode;
};

const EMPTY_INFOS: NonNullable<Specie["informacoes"]> = [];

export default function CardInfo({
  specie,
  images = [],
  details,
  children,
}: Props) {
  const infos =
    details?.informacoes ?? details?.informacoesEspecies ?? EMPTY_INFOS;
  const mainDescription = details?.descricao ?? "";
  const { user } = useAuth();

  const [expanded, setExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  const [descHtml, setDescHtml] = useState(() => sanitizeHtml(mainDescription));
  const [infosHtml, setInfosHtml] = useState<Record<string, string>>({});

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  const [previousSpecie, setPreviousSpecie] = useState(specie.id_especie);
  if (previousSpecie !== specie.id_especie) {
    setPreviousSpecie(specie.id_especie); setActiveImageIndex(0); setIsModalOpen(false); setModalImageIndex(0);
  }

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setActiveImageIndex(index);
    setModalImageIndex(index);
    setIsModalOpen(true);
  };

  useEffect(() => {
    let active = true;

    const processarTudo = async () => {
      if (!user) {
        setDescHtml(sanitizeHtml(mainDescription));
        setInfosHtml({});
        return;
      }

      try {
        const artigos = await listarArtigos();
        if (!active) return;

        setDescHtml(processArticleReferences(mainDescription, artigos));

        const novasInfos: Record<string, string> = {};
        infos.forEach((info) => {
          if (!info.informacao) return;
          novasInfos[info.id_informacaoespecie] = processArticleReferences(
            info.informacao,
            artigos,
          );
        });
        setInfosHtml(novasInfos);
      } catch (error) {
        if (!active) return;

        console.error("Erro ao carregar artigos para processamento de texto:", error);
        setDescHtml(sanitizeHtml(mainDescription));
        setInfosHtml({});
      }
    };

    processarTudo();

    return () => {
      active = false;
    };
  }, [mainDescription, infos, user]);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight || "20");
      const maxHeight = lineHeight * 6;
      setShowButton(el.scrollHeight > maxHeight);
    }
  }, [descHtml]);

  return (
    <div className="w-full mb-12 mt-2 flex-[1_1_375px] flex flex-col">
      <h2 className="text-xl font-semibold mb-4">
        {specie.nome} ({specie.nome_cientifico})
      </h2>
      <div className="flex gap-6 max-[1024px]:flex-col">
        <div className="flex-1 min-w-0">
          {images.length > 0 ? (
            <>
              <Image
                src={images[activeImageIndex]}
                alt={specie.nome}
                width={429}
                height={256}
                unoptimized
                className="w-full max-h-[300px] object-cover cursor-pointer rounded-lg"
                onClick={() => {
                  setModalImageIndex(activeImageIndex);
                  setIsModalOpen(true);
                }}
              />

              {images.length > 1 && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                  {images.map((img, index) => (
                    <Image
                      key={index}
                      src={img}
                      alt={`${specie.nome} ${index + 1}`}
                      width={80}
                      height={60}
                      unoptimized
                      className={`h-[60px] w-[80px] object-cover cursor-pointer rounded border-2 transition-all flex-shrink-0 ${
                        index === activeImageIndex
                          ? "border-[#233263] opacity-100"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      onClick={() => handleThumbnailClick(index)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500">Nenhuma imagem disponível.</p>
          )}
        </div>

        <div className="flex-[1_1_500px] max-[1024px]:flex-auto infoContainer">
          <h2 className="font-bold text-lg mb-2">Informações</h2>
          {infos.length > 0 ? (
            <div className="flex flex-col gap-2">
              {infos.map((info) => (
                <div
                  key={info.id_informacaoespecie}
                  className="bg-white p-2 rounded shadow-sm"
                >
                  <span className="font-semibold">
                    {info.tipo_informacao}:{" "}
                  </span>
                  <span
                    className="[&_a]:font-normal [&_a]:text-blue-600 [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:underline [&_a:focus-visible]:underline [&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-blue-600"
                    dangerouslySetInnerHTML={{
                      __html:
                        infosHtml[info.id_informacaoespecie] ||
                        sanitizeHtml(info.informacao),
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Sem informações cadastradas.</p>
          )}
        </div>
      </div>

      <div className="mt-4">{children}</div>

      {mainDescription && (
        <div className="mt-6 text-sm text-gray-700 border-t border-gray-100 pt-4">
          <h2 className="font-bold text-lg mb-2">Descrição</h2>
          <p
            ref={textRef}
            className={`transition-all duration-300 [&_a]:font-normal [&_a]:text-blue-600 [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:underline [&_a:focus-visible]:underline [&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-blue-600 ${expanded ? "" : "line-clamp-6"}`}
            dangerouslySetInnerHTML={{ __html: descHtml }}
          />
          {showButton && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-text font-bold hover:underline"
            >
              {expanded ? "Ler menos" : "Ler mais"}
            </button>
          )}
        </div>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/40 hover:bg-black/60 w-10 h-10 rounded-full flex items-center justify-center z-50 transition-colors"
          >
            ✕
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 p-3 rounded-full z-50 text-2xl font-bold transition-colors"
              >
                ‹
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 p-3 rounded-full z-50 text-2xl font-bold transition-colors"
              >
                ›
              </button>
            </>
          )}

          <div className="relative max-w-4xl max-h-[80vh] w-full h-full flex items-center justify-center">
            <Image unoptimized width={1024} height={768}
              src={images[modalImageIndex]}
              alt={specie.nome}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
