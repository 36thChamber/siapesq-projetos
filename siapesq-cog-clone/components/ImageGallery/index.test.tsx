import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

import ImageGallery, { type GalleryImage } from "./index";

vi.mock("@/context/PlatformThemeContext", () => ({
  usePlatformTheme: () => ({
    theme: {
      colors: {
        gray: { 100: "#f3f4f6", 200: "#e5e7eb" },
        muted: "#6b7280",
        primary: { 500: "#2563eb" },
      },
    },
  }),
}));

const images: GalleryImage[] = [
  { src: "https://img/1", alt: "Foto 1", caption: "Puma concolor" },
  { src: "https://img/2", alt: "Foto 2", caption: "Nasua nasua" },
  { src: "https://img/3", alt: "Foto 3", caption: "Turdus rufiventris" },
];

// A imagem principal é sempre a primeira <img>; as miniaturas vêm depois.
const mainImg = (view: ReturnType<typeof render>) => view.getAllByRole("img")[0];
const mainSrc = (view: ReturnType<typeof render>) => mainImg(view).getAttribute("src");

afterEach(() => {
  cleanup();
});

describe("ImageGallery", () => {
  it("não renderiza nada sem imagens", () => {
    const view = render(<ImageGallery images={[]} ariaLabel="Galeria" />);
    expect(view.container.firstChild).toBeNull();
  });

  it("inicia na primeira imagem, exibe a legenda e marca a miniatura ativa", () => {
    const view = render(
      <ImageGallery
        images={images}
        ariaLabel="Galeria"
        thumbnailAlt={(img) => `Miniatura: ${img.caption}`}
      />,
    );

    expect(mainSrc(view)).toBe("https://img/1");
    expect(view.getByText("Puma concolor")).toBeTruthy();

    const thumbs = view.getAllByRole("button", { current: true });
    expect(thumbs).toHaveLength(1);
    expect(thumbs[0].style.border).toContain("rgb(37, 99, 235)");
  });

  it("ocupa a largura disponível e mantém as miniaturas abaixo da imagem principal", () => {
    const view = render(<ImageGallery images={images} ariaLabel="Galeria" />);
    const gallery = view.getByRole("region", { name: "Galeria" });
    const firstImageInstances = view.getAllByRole("img", { name: "Foto 1" });
    const mainImage = firstImageInstances[0];
    const firstThumbnail = firstImageInstances[1].parentElement;

    expect(gallery.classList.contains("w-full")).toBe(true);
    expect(gallery.classList.contains("max-w-[400px]")).toBe(false);
    expect(gallery.classList.contains("lg:ml-auto")).toBe(false);
    expect(gallery.children[0].contains(mainImage)).toBe(true);
    expect(gallery.children[1].contains(firstThumbnail)).toBe(true);
  });

  it("troca o destaque ao clicar na miniatura", () => {
    const view = render(
      <ImageGallery
        images={images}
        ariaLabel="Galeria"
        thumbnailAlt={(img) => `Miniatura: ${img.caption}`}
      />,
    );

    fireEvent.click(view.getByRole("img", { name: "Miniatura: Turdus rufiventris" }));

    expect(mainSrc(view)).toBe("https://img/3");
    expect(view.getByText("Imagem 3 de 3: Foto 3")).toBeTruthy();
  });

  it("avança automaticamente a cada cinco segundos e volta ao início", () => {
    vi.useFakeTimers();
    const view = render(<ImageGallery images={images} ariaLabel="Galeria" autoPlay />);

    act(() => vi.advanceTimersByTime(5000));
    expect(mainSrc(view)).toBe("https://img/2");
    act(() => vi.advanceTimersByTime(5000));
    expect(mainSrc(view)).toBe("https://img/3");
    act(() => vi.advanceTimersByTime(5000));
    expect(mainSrc(view)).toBe("https://img/1");
    vi.useRealTimers();
  });

  it("pausa autoplay ao passar o cursor e retoma ao sair", () => {
    vi.useFakeTimers();
    const view = render(<ImageGallery images={images} ariaLabel="Galeria" autoPlay />);
    fireEvent.mouseEnter(view.getByRole("region"));
    act(() => vi.advanceTimersByTime(5000));
    expect(mainSrc(view)).toBe("https://img/1");
    fireEvent.mouseLeave(view.getByRole("region"));
    act(() => vi.advanceTimersByTime(5000));
    expect(mainSrc(view)).toBe("https://img/2");
    vi.useRealTimers();
  });

  it("navega pelas setas com retorno circular", () => {
    const view = render(<ImageGallery images={images} ariaLabel="Galeria" showArrows />);

    fireEvent.click(view.getByRole("button", { name: "Imagem anterior" }));
    expect(mainSrc(view)).toBe("https://img/3");

    fireEvent.click(view.getByRole("button", { name: "Próxima imagem" }));
    expect(mainSrc(view)).toBe("https://img/1");
  });

  it("navega pelo teclado com as setas ← →", () => {
    const view = render(<ImageGallery images={images} ariaLabel="Galeria" />);
    const region = view.getByRole("region", { name: "Galeria" });

    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(mainSrc(view)).toBe("https://img/2");

    fireEvent.keyDown(region, { key: "ArrowLeft" });
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(mainSrc(view)).toBe("https://img/3");
  });

  it("não exibe setas nem miniaturas com uma única imagem", () => {
    const view = render(
      <ImageGallery images={[images[0]]} ariaLabel="Galeria" showArrows />,
    );

    expect(view.queryByRole("button", { name: "Próxima imagem" })).toBeNull();
    expect(view.queryAllByRole("button")).toHaveLength(0);
  });

  it("mostra fallback quando a imagem principal falha ao carregar", () => {
    const view = render(<ImageGallery images={images} ariaLabel="Galeria" />);

    fireEvent.error(mainImg(view));

    expect(view.getByText("Imagem indisponível.")).toBeTruthy();
  });

  it("chama onMainImageClick com o índice ativo", () => {
    const onMainImageClick = vi.fn();
    const view = render(
      <ImageGallery
        images={images}
        ariaLabel="Galeria"
        showArrows
        onMainImageClick={onMainImageClick}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "Próxima imagem" }));
    fireEvent.click(view.getByRole("button", { name: "Ampliar imagem: Foto 2" }));

    expect(onMainImageClick).toHaveBeenCalledWith(1);
  });
});
