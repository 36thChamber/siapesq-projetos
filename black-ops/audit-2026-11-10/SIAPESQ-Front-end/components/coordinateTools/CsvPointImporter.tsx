"use client";

import { useState, useRef } from "react";
import { usePlatformTheme } from "@/context/PlatformThemeContext";
import { isValidCoordinate, pointKey, MapPoint } from "./types";
import { UploadIcon } from "@/components/icons";

interface CsvPointImporterProps {
  existingPoints: MapPoint[];
  onImportPoints: (points: MapPoint[]) => void;
}

const LAT_COLUMNS = ["lat", "latitude"];
const LNG_COLUMNS = ["lng", "longitude", "lon", "long"];
const NAME_COLUMNS = ["nome", "name", "label", "titulo"];

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export default function CsvPointImporter({
  existingPoints,
  onImportPoints,
}: CsvPointImporterProps) {
  const { theme } = usePlatformTheme();
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFeedback({ message: "O arquivo deve ser .csv", type: "error" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setFeedback({ message: "Arquivo vazio", type: "error" });
        return;
      }

      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setFeedback({
          message: "CSV deve ter cabeçalho e ao menos uma linha de dados",
          type: "error",
        });
        return;
      }

      const headers = parseCsvLine(lines[0]).map((h) =>
        h.toLowerCase().replace(/['"]/g, ""),
      );

      const latIdx = headers.findIndex((h) => LAT_COLUMNS.includes(h));
      const lngIdx = headers.findIndex((h) => LNG_COLUMNS.includes(h));
      const nameIdx = headers.findIndex((h) => NAME_COLUMNS.includes(h));

      if (latIdx === -1 || lngIdx === -1) {
        setFeedback({
          message:
            "Colunas de latitude/longitude não encontradas. Use: lat, lng",
          type: "error",
        });
        return;
      }

      const newPoints: MapPoint[] = [];
      let invalid = 0;

      const seenKeys = new Set(
        existingPoints.map((p) => pointKey(p.lat, p.lng)),
      );

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const lat = parseFloat(cols[latIdx]);
        const lng = parseFloat(cols[lngIdx]);
        const label = nameIdx >= 0 ? cols[nameIdx] : undefined;

        if (!isValidCoordinate(lat, lng)) {
          invalid++;
          continue;
        }

        const key = pointKey(lat, lng);
        if (seenKeys.has(key)) {
          continue;
        }
        seenKeys.add(key);

        newPoints.push({
          id: `csv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          lat,
          lng,
          source: "csv",
          label: label || undefined,
        });
      }

      if (newPoints.length === 0) {
        setFeedback({
          message: "Nenhum ponto válido encontrado no arquivo",
          type: "error",
        });
        return;
      }

      onImportPoints(newPoints);

      const msg =
        invalid > 0
          ? `${newPoints.length} ponto(s) importado(s), ${invalid} ignorada(s)`
          : `${newPoints.length} ponto(s) importado(s)`;
      setFeedback({ message: msg, type: "success" });
    };

    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-xs font-medium"
        style={{ color: theme.colors.primary[500] }}
      >
        Importar CSV
      </span>

      <p className="text-[10px]" style={{ color: theme.colors.muted }}>
        Colunas aceitas: lat/latitude, lng/longitude, nome (opcional)
      </p>

      <label
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-white rounded cursor-pointer hover:opacity-90 transition-opacity"
        style={{ backgroundColor: theme.colors.primary[500] }}
      >
        <UploadIcon size={14} color="white" />
        Selecionar arquivo
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="hidden"
        />
      </label>

      {feedback && (
        <span
          className={`text-[10px] ${feedback.type === "error" ? "text-red-500" : "text-green-600"}`}
        >
          {feedback.message}
        </span>
      )}
    </div>
  );
}
