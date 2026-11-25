import { Sequelize } from "sequelize-typescript";
import Usuarios from "../models/Usuarios";
import AreasAlertas from "../models/AreasAlertas";
import Alertas from "../models/Alertas";
import Reservatorios from "../models/Reservatorios";

export default class ORM {
  private sequelize: Sequelize;

  constructor(databaseUrl: string) {
    const useSSL = process.env.DB_SSL === "true";

    this.sequelize = new Sequelize(databaseUrl, {
      dialect: "postgres",
      logging: false,
      models: [
        Usuarios,
        AreasAlertas,
        Alertas,
        Reservatorios
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

  async init(force: boolean = false): Promise<Sequelize> {
    if (force || process.env.DB_SYNC === "true") {
      throw new Error(
        "DB_SYNC/force não é suportado: execute npm run db:migrate antes de iniciar a API.",
      );
    }

    await this.sequelize.authenticate();

    return this.sequelize;
  }
}
