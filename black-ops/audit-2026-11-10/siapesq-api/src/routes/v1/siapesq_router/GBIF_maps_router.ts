import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

const BASE_URL = "https://api.gbif.org/v2";

router.get("/density/:z/:x/:y", async (req: Request, res: Response) => {
  const { z, x, y } = req.params;
  const {
    srs = "EPSG:4326",
    style = "green.point",
    format = "@1x.png",
    taxonKey,
    country,
  } = req.query;

  try {
    const url = `${BASE_URL}/map/occurrence/density/${z}/${x}/${y}${format}?srs=${srs}&style=${style}${
      taxonKey ? `&taxonKey=${taxonKey}` : ""
    }${country ? `&country=${country}` : ""}`;

    const response = await axios.get(url, { responseType: "arraybuffer" });
    res.set("Content-Type", "image/png");
    res.send(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar tile de densidade" });
  }
});

router.get("/capabilities", async (req: Request, res: Response) => {
  try {
    const url = `${BASE_URL}/map/occurrence/density/capabilities.json`;
    const response = await axios.get(url, { params: req.query });
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar capabilities" });
  }
});

router.get("/adhoc/:z/:x/:y", async (req: Request, res: Response) => {
  const { z, x, y } = req.params;
  const {
    srs = "EPSG:4326",
    style = "classic.point",
    format = "@1x.png",
    taxonKey,
    country,
  } = req.query;

  try {
    const url = `${BASE_URL}/map/occurrence/adhoc/${z}/${x}/${y}${format}?srs=${srs}&style=${style}${
      taxonKey ? `&taxonKey=${taxonKey}` : ""
    }${country ? `&country=${country}` : ""}`;

    const response = await axios.get(url, { responseType: "arraybuffer" });
    res.set("Content-Type", "image/png");
    res.send(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar tile ad-hoc" });
  }
});

export default router;
