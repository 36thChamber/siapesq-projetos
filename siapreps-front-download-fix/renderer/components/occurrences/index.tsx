import SideBar from "../atoms/sideBar";
import { useState } from "react";

import TableDynamic from "../atoms/tableDynamic";
import ActionButton from "../atoms/tableDynamic/ActionButton";
import { ColumnDefinition } from "../atoms/tableDynamic/types";

interface Species {
  name: string;
  count: number;
  csvUrl: string;
}

const species: Species[] = [
  {
    name: "Bugio-ruivo (Alouatta guariba)",
    count: 1098,
    csvUrl: "guariba",
  },
  {
    name: "Bugio-preto (Alouatta caraya)",
    count: 2318,
    csvUrl: "caraya",
  },
  {
    name: "Macaco-prego-preto (Sapajus nigritus)",
    count: 2142,
    csvUrl: "nigritus",
  },
];

export default function OccurrencesPage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadCsv = async (csvUrl: string) => {
    try {
      setDownloading(true);

      const token = await window.auth.getToken();

      if (!token) {
        alert("Faça login primeiro");
        return;
      }

      const success = await window.analisesAPI.downloadCsv(token, csvUrl);

      console.log("CSV baixado:", success);

      if (success) {
        console.log("CSV baixado com sucesso:", success);
        alert("CSV baixado com sucesso!");
      } else {
        alert("Erro ao baixar CSV");
      }
    } catch (error) {
      console.error("Erro download:", error);
      alert("Erro ao baixar CSV");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setDownloading(true);

      const token = await window.auth.getToken();

      if (!token) {
        alert("Faça login primeiro");
        return;
      }

      // Download sequencial com feedback
      for (const s of species) {
        const success = await window.analisesAPI.downloadCsv(
          token,
          s.csvUrl
        );

        console.log(`CSV ${s.csvUrl}:`, success ? "OK" : "Falhou");
      }

      alert("Todos CSVs baixados!");
    } catch (error) {
      console.error("Erro download all:", error);
      alert("Erro ao baixar CSVs");
    } finally {
      setDownloading(false);
    }
  };

  const columns: ColumnDefinition<Species>[] = [
    {
      key: "name",
      header: "Espécie",
      align: "left",
    },
    {
      key: "count",
      header: "Nº ocorrências",
      align: "left",
      render: (value: number) => value.toLocaleString("pt-BR"),
    },
    {
      key: "csvUrl",
      header: "Arquivo",
      align: "left",
      render: (_value: any, row: Species) => (
        <ActionButton
          label="Baixar CSV"
          onClick={() => handleDownloadCsv(row.csvUrl)}
          variant="primary"
          size="sm"
          disabled={downloading}
          loading={downloading}
        />
      ),
    },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SideBar />

      <main
        style={{
          flex: 1,
          padding: "32px",
          backgroundColor: "#E0F5F4",
        }}
      >
        <h2
          className="font-poppins text-dark_green font-semibold text-2xl"
          style={{ marginBottom: "24px" }}
        >
          Número de ocorrências registradas: 5.558
        </h2>

        <TableDynamic
          columns={columns}
          data={species}
          striped={true}
          hoverable={true}
          bordered={false}
          emptyMessage="Nenhuma espécie encontrada"
        />

        <div style={{ marginTop: "24px" }}>
          <ActionButton
            label="Baixar todos CSVs"
            onClick={handleDownloadAll}
            variant="primary"
            size="md"
            disabled={downloading}
            loading={downloading}
          />
        </div>
      </main>
    </div>
  );
}