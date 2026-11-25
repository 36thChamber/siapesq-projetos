import { Sequelize } from "sequelize-typescript";
import Usuarios from "../models/Usuarios";
import Especies from "../models/Especies";
import GruposEspecies from "../models/GrupoEspecies";
import InformacoesEspecies from "../models/InformacoesEspecies";
import Analises from "../models/Analises";
import Artigos from "../models/Artigos";
import Assinaturas from "../models/Assinaturas";
import Planos from "../models/Planos";
import Pagementos from "../models/Pagamentos";
import InformacoesEspeciesArtigos from "../models/InformacoesEspeciesArtigos"
import VisualizacoesEspecies from "../models/VisualizacoesEspecies"
export default class ORM {
  private sequelize: Sequelize;

  constructor(databaseUrl: string) {
    const useSSL = process.env.DB_SSL === "true";

    this.sequelize = new Sequelize(databaseUrl, {
      dialect: "postgres",
      logging: false,
      models: [
        Usuarios,
        Especies,
        GruposEspecies,
        InformacoesEspecies,
        Analises,
        Artigos,
        Assinaturas,
        Planos,
        Pagementos,
        InformacoesEspeciesArtigos,
        VisualizacoesEspecies
      ],
      dialectOptions: useSSL
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }
        : {},
    });
  }

  async init(): Promise<Sequelize> {
    await this.sequelize.authenticate();
    return this.sequelize;
  }

  async close(): Promise<void> {
    await this.sequelize.close();
  }
}
