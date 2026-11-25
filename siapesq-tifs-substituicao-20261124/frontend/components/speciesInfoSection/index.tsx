"use client";
import NextImage from "next/image";

import { Especie as Specie } from "@/services/types/especie.types";
import { LockIcon } from "@/components/icons";
import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import ImageGallery, { type GalleryImage } from "@/components/ImageGallery";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { listarArtigos } from "@/services/api/artigos.service";
import { sanitizeHtml } from "@/utils/sanitizeHtml";
import { processArticleReferences } from "@/utils/articleReferences";
import type { SpeciesImageApiItem } from "@/services/types/gbif.types";
import ImageCredit from "@/components/ImageGallery/ImageCredit";

type Props = {
  specie: Specie;
  images?: string[];
  imageDetails?: SpeciesImageApiItem[];
  details?: Specie;
  isBlocked?: boolean;
  children?: React.ReactNode;
};

const EMPTY_INFOS: NonNullable<Specie["informacoes"]> = [];

export default function SpeciesInfoSection({
  specie,
  images = [],
  imageDetails = [],
  details,
  isBlocked = false,
  children,
}: Props) {
  const { theme } = usePlatformTheme();
  const infos =
    details?.informacoes ?? details?.informacoesEspecies ?? EMPTY_INFOS;
  const mainDescription = details?.descricao ?? "";
  const { user } = useAuth();

  const [expanded, setExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  const [descHtml, setDescHtml] = useState(() => sanitizeHtml(mainDescription));
  const [infosHtml, setInfosHtml] = useState<Record<string, string>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  const galleryImages = useMemo<GalleryImage[]>(
    () => images.map((src) => ({ src, alt: specie.nome, credit: imageDetails.find(image => image.url === src) })),
    [images, imageDetails, specie.nome],
  );

  const handleModalPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleModalNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const openModal = (index: number) => {
    setModalImageIndex(index);
    setIsModalOpen(true);
  };

  useEffect(() => {
    let active = true;

    const processarTudo = async () => {
      if (!user || isBlocked) {
        setDescHtml(sanitizeHtml(mainDescription));
        setInfosHtml({});
        return;
      }

      try {
        const listaArtigos = await listarArtigos();
        if (!active) return;

        if (mainDescription) {
          setDescHtml(processArticleReferences(mainDescription, listaArtigos));
        }

        const novasInfos: Record<string, string> = {};
        infos.forEach((info) => {
          if (info.informacao) {
            novasInfos[info.id_informacaoespecie] = processArticleReferences(
              info.informacao,
              listaArtigos,
            );
          }
        });
        setInfosHtml(novasInfos);
      } catch (error) {
        if (!active) return;

        console.error("Erro ao carregar referências dos artigos:", error);
        setDescHtml(sanitizeHtml(mainDescription));
        setInfosHtml({});
      }
    };

    processarTudo();

    return () => {
      active = false;
    };
  }, [mainDescription, infos, user, isBlocked]);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight || "20");
      const maxHeight = lineHeight * 6;
      setShowButton(el.scrollHeight > maxHeight);
    }
  }, [descHtml]);

  return (
    <div className="relative">
      {isBlocked && (
        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-[#00000086] flex justify-center items-center rounded-xl">
          <LockIcon size={30} color="white" />
        </div>
      )}

      <div
        className="bg-white rounded-xl border flex flex-col gap-6 p-8 max-sm:p-4 shadow-md"
        style={{ borderColor: theme.colors.gray[200] }}
      >
        {/* Titulo */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0">
          <h1
            className="text-3xl max-sm:text-2xl font-bold"
            style={{ color: theme.colors.titleColor }}
          >
            {specie.nome}
          </h1>
          <span
            className="text-2xl max-sm:text-lg font-semibold italic"
            style={{ color: theme.colors.titleColor }}
          >
            ({specie.nome_cientifico})
          </span>
        </div>

        {/* Imagem principal + thumbnails */}
        {galleryImages.length > 0 ? (
          <ImageGallery
            key={specie.id_especie}
            images={galleryImages}
            ariaLabel={`Imagens de ${specie.nome}`}
            mainClassName="h-[620px] max-sm:h-[400px]"
            thumbnailAlt={(_, i) => `${specie.nome} ${i + 1}`}
            onMainImageClick={openModal}
          />
        ) : (
          <div
            className="rounded-xl flex items-center justify-center h-[320px] max-sm:h-[220px]"
            style={{ backgroundColor: theme.colors.gray[100] }}
          >
            <p style={{ color: theme.colors.muted }}>
              Nenhuma imagem disponível.
            </p>
          </div>
        )}

        {/* Informacoes */}
        {infos.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2
              className="text-2xl max-sm:text-xl font-semibold"
              style={{ color: theme.colors.titleColor }}
            >
              Informações
            </h2>

            <div className="flex flex-col gap-4">
              {infos.map((info) => (
                <p
                  key={info.id_informacaoespecie}
                  className="text-base leading-relaxed"
                >
                  <span
                    className="font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    {info.tipo_informacao}:{" "}
                  </span>
                  <span
                    className="[&_a]:font-normal [&_a]:text-[var(--citation-color)] [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:underline [&_a:focus-visible]:underline [&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-[var(--citation-color)]"
                    style={
                      {
                        color: theme.colors.muted,
                        "--citation-color": theme.colors.titleHighlight,
                      } as React.CSSProperties
                    }
                    dangerouslySetInnerHTML={{
                      __html:
                        infosHtml[info.id_informacaoespecie] ??
                        sanitizeHtml(info.informacao),
                    }}
                  />
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Descricao */}
        {mainDescription && (
          <div className="flex flex-col gap-2">
            <h2
              className="text-2xl max-sm:text-xl font-semibold"
              style={{ color: theme.colors.titleColor }}
            >
              Descrição
            </h2>

            <div
              className="w-10 h-0.5 rounded-full"
              style={{ backgroundColor: theme.colors.titleColor }}
            />

            <p
              ref={textRef}
              className={`text-base leading-7 mt-1 transition-all duration-300 [&_a]:font-normal [&_a]:text-[var(--citation-color)] [&_a]:no-underline [&_a]:transition-colors [&_a:hover]:underline [&_a:focus-visible]:underline [&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-[var(--citation-color)] ${
                expanded ? "" : "line-clamp-6"
              }`}
              style={
                {
                  color: theme.colors.muted,
                  "--citation-color": theme.colors.titleHighlight,
                } as React.CSSProperties
              }
              dangerouslySetInnerHTML={{ __html: descHtml }}
            />

            {showButton && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-sm font-semibold tracking-wider w-fit mt-1 hover:opacity-80 transition-opacity"
                style={{ color: theme.colors.text }}
              >
                {expanded ? "Ler menos" : "Ler mais"}
                <span className="text-base">→</span>
              </button>
            )}
          </div>
        )}

        {details?.fontes && details.fontes.length > 0 && <div className="space-y-2">
          <h2 className="text-lg font-semibold">Fontes e documentos</h2>
          <ul className="space-y-1 text-sm">
            {details.fontes.filter(source => /^https?:\/\//.test(source.url)).map(source => <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer" className="text-sky-800 underline">{source.titulo}</a>
            </li>)}
          </ul>
        </div>}

        {/* Children (link monitoramento, etc.) */}
        {children && <div className="mt-2">{children}</div>}
      </div>

      {/* Modal de imagem */}
      {isModalOpen && images.length > 0 && (
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
                onClick={handleModalPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 p-3 rounded-full z-50 text-2xl font-bold transition-colors"
              >
                ‹
              </button>
              <button
                onClick={handleModalNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 p-3 rounded-full z-50 text-2xl font-bold transition-colors"
              >
                ›
              </button>
            </>
          )}

          <div className="relative max-w-4xl max-h-[80vh] w-full h-full flex flex-col items-center justify-center gap-2">
            <NextImage unoptimized width={1024} height={768}
              src={images[modalImageIndex]}
              alt={specie.nome}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
              onClick={(e) => e.stopPropagation()}
            />
            {imageDetails[modalImageIndex] && <div className="rounded bg-white p-2" onClick={event => event.stopPropagation()}>
              <ImageCredit image={imageDetails[modalImageIndex]} />
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}
