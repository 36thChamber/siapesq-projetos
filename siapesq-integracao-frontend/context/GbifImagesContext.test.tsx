import { useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GbifImagesProvider,
  useGbifImages,
} from "@/context/GbifImagesContext";
import { getSpeciesImages } from "@/services/api/gbif.service";

vi.mock("@/services/api/gbif.service", () => ({
  getSpeciesImages: vi.fn(),
}));

type ContextValue = ReturnType<typeof useGbifImages>;

let contextValue: ContextValue | null = null;

function Consumer() {
  const value = useGbifImages();
  useEffect(() => { contextValue = value; }, [value]);
  return null;
}

function renderProvider() {
  return render(
    <GbifImagesProvider>
      <Consumer />
    </GbifImagesProvider>,
  );
}

describe("GbifImagesProvider", () => {
  beforeEach(() => {
    contextValue = null;
    vi.clearAllMocks();
  });

  it("deduplica chamadas concorrentes para a mesma usageKey", async () => {
    let resolveImages: (images: {usageKey:number;images:{url:string}[]}) => void = () => undefined;
    vi.mocked(getSpeciesImages).mockReturnValue(
      new Promise((resolve) => {
        resolveImages = resolve;
      }),
    );
    renderProvider();

    act(() => {
      contextValue!.preloadImages(123);
      contextValue!.preloadImages(123);
    });

    expect(getSpeciesImages).toHaveBeenCalledTimes(1);

    act(() => resolveImages({usageKey:123,images:[{url:"https://image-1"}]}));

    await waitFor(() => {
      expect(contextValue!.imagesCache[123]).toEqual(["https://image-1"]);
    });
  });

  it("mantém lista vazia em cache como resultado concluído", async () => {
    vi.mocked(getSpeciesImages).mockResolvedValue({usageKey:123,images:[]});
    renderProvider();

    act(() => contextValue!.preloadImages(123));

    await waitFor(() => {
      expect(contextValue!.imagesCache[123]).toEqual([]);
    });

    act(() => contextValue!.preloadImages(123));
    expect(getSpeciesImages).toHaveBeenCalledTimes(1);
  });

  it("libera uma nova tentativa depois de falha", async () => {
    const error = new Error("storage indisponível");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getSpeciesImages)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({usageKey:123,images:[{url:"https://image-after-retry"}]});
    renderProvider();

    act(() => contextValue!.preloadImages(123));

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "Erro ao buscar imagens da espécie.",
      );
    });

    act(() => contextValue!.preloadImages(123));

    await waitFor(() => {
      expect(getSpeciesImages).toHaveBeenCalledTimes(2);
      expect(contextValue!.imagesCache[123]).toEqual([
        "https://image-after-retry",
      ]);
    });

    consoleError.mockRestore();
  });
});
