import { Sequelize } from "sequelize-typescript";

import Usuarios from "../models/Usuarios";
import UsuariosAtivos from "../models/UsuariosAtivos";
import UsuariosPb from "../models/phytoBloom/Usuarios";
import Reservatorios from "../models/phytoBloom/Reservatorios";
import Servidores from "../models/phytoBloom/Servidores";
import Alertas from "../models/phytoBloom/Alertas";
import Areas_Alertas from "../models/phytoBloom/Areas_Alertas";
import Portos from "../models/Portos";
import Embarcacoes from "../models/Embarcacoes";
import Motores from "../models/Motores";
import MarcaMotores from "../models/Marca-Motores";
import Iscas from "../models/Iscas";
import Armadilhas from "../models/Armadilhas";
import Fundos from "../models/Fundos";
import EntradaPortos from "../models/EntradaPortos";
import SaidaPortos from "../models/SaidaPortos";
import Especies from "../models/Especies";
import Missoes from "../models/Missoes";
import Lances from "../models/Lances";
import EspecieMissaoAlvo from "../models/EspecieMissaoAlvo";
import EspecieLance from "../models/EspecieLance";
import Relatorios from "../models/Relatorios";
import ArtesDePesca from "../models/ArtesDePesca";
import PeixeRFID from "../models/PeixeRFID";
import Especies_analises from "../models/Especies_analises";

import default_portos from "./data/portos.json";
import default_especies from "./data/especies.json";
import default_artes_de_pesca from "./data/artes_de_pesca.json";
import default_iscas from "./data/iscas.json";
import default_fundos from "./data/fundos.json";
import EspecieDescartes from "../models/EspecieDescartes";
import EspecieIncidentais from "../models/EspecieIncidentais";

import Usuarios_siapesq from "../models/siapesq/Usuarios";
import Especies_siapesq from "../models/siapesq/Especies";
import gruposEspecies from "../models/siapesq/GrupoEspecies";
import informacoesEspecies from "../models/siapesq/InformacoesEspecies";
import analises from "../models/siapesq/Analises";
import artigos from "../models/siapesq/Artigos";

export default class ORM {
  private db: Sequelize;
  constructor(DATABASE_URL: string) {
    const useSSL = process.env.DATABASE_SSL !== "false";
    const sequelize = new Sequelize(DATABASE_URL, {
      models: [
        Especies,
        Iscas,
        Armadilhas,
        Fundos,
        MarcaMotores,
        Motores,
        Portos,
        Embarcacoes,
        ArtesDePesca,
        EntradaPortos,
        SaidaPortos,
        Usuarios,
        UsuariosAtivos,
        Relatorios,
        Missoes,
        Lances,
        EspecieLance,
        EspecieDescartes,
        EspecieIncidentais,
        EspecieMissaoAlvo,
        Especies_analises,
        PeixeRFID,
        Reservatorios,
        UsuariosPb,
        Alertas,
        Servidores,
        Areas_Alertas,
        Usuarios_siapesq,
        Especies_siapesq,
        gruposEspecies,
        informacoesEspecies,
        artigos,
        analises
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
    this.db = sequelize;
  }
  async init(force: boolean = false) {
    const enviroment = process.env.NODE_ENV;
    if (force && enviroment == "PROD") {
      force = false;
    }
    await this.db.sync({ force });
    if (force) {
      await Portos.bulkCreate(default_portos);
      await Especies.bulkCreate(default_especies);
      await ArtesDePesca.bulkCreate(default_artes_de_pesca);
      await Iscas.bulkCreate(default_iscas);
      await Fundos.bulkCreate(default_fundos);
    }
  }
}
