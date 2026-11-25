import { Sequelize } from "sequelize-typescript";
import { SIAPREPS_MODELS } from "./models";

export default class ORM {
  private sequelize: Sequelize;

  constructor(databaseUrl: string) {
    const useSSL = process.env.DB_SSL === "true";

    this.sequelize = new Sequelize(databaseUrl, {
      dialect: "postgres",
      logging: false,
      models: SIAPREPS_MODELS,
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
}
