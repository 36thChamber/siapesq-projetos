require("dotenv").config();

const fs = require("node:fs");

const url = process.env.MIGRATION_DATABASE_URL;
if (!url) {
  throw new Error("MIGRATION_DATABASE_URL não definida. Informe explicitamente o banco alvo das migrations.");
}

const sslEnabled = process.env.MIGRATION_DB_SSL === "true";
const caPath = process.env.MIGRATION_DB_SSL_CA_FILE;
const ssl = sslEnabled
  ? {
      rejectUnauthorized: process.env.MIGRATION_DB_SSL_REJECT_UNAUTHORIZED !== "false",
      ...(caPath ? { ca: fs.readFileSync(caPath, "utf8") } : {}),
    }
  : false;

const config = {
  url,
  dialect: "postgres",
  ssl: sslEnabled,
  dialectOptions: { ssl },
  migrationStorage: "sequelize",
  migrationStorageTableName: "SequelizeMetaSiapesq",
  migrationStorageTableSchema: "public",
  logging: false,
};

module.exports = {
  development: config,
  test: config,
  production: config,
  prod: config,
};
