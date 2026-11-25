import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

interface MatchResponse {
  usageKey?: number;
  scientificName?: string;
}

interface Occurrence {
  country?: string;
  decimalLatitude?: number;
  decimalLongitude?: number;
  eventDate?: string;
  locality?: string;
}

interface OccurrenceResponse {
  results: Occurrence[];
}

async function fetchJson<T>(url: string): Promise<T> {
  try {
    const resp = await axios.get<T>(url);
    return resp.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const msg = `Erro ao buscar ${url}: ${status ?? "desconhecido"} ${statusText ?? ""}`.trim();
      throw new Error(msg);
    }
    throw error;
  }
}

router.post("/buscar-especie", async (req: Request, res: Response) => {
  try {
    const { especie } = req.body as { especie: string };

    const matchData = await fetchJson<MatchResponse>(
      `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(especie)}`
    );

    if (!matchData.usageKey) {
      return res.status(404).json({ error: "Espécie não encontrada no GBIF" });
    }

    const taxonKey = matchData.usageKey;

    const occData = await fetchJson<OccurrenceResponse>(
      `https://api.gbif.org/v1/occurrence/search?taxonKey=${taxonKey}&limit=50`
    );

    const ocorrencias = occData.results
      .map((o) => ({
        pais: o.country ?? "Desconhecido",
        lat: o.decimalLatitude,
        lng: o.decimalLongitude,
        data: o.eventDate,
        localidade: o.locality ?? "Não informada",
      }))
      .filter((o) => o.lat !== undefined && o.lng !== undefined);

    return res.json({
      especie,
      taxonKey,
      total: ocorrencias.length,
      ocorrencias,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao buscar dados no GBIF" });
  }
});

export default router;
