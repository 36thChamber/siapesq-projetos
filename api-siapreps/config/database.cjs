"use strict";

const fs = require("fs");

const URL_VARIABLE = "MIGRATION_DATABASE_URL";
const METADATA_TABLE = "SequelizeMetaSiapreps";
const METADATA_SCHEMA = "public";

function parseBoolean(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} deve ser 'true' ou 'false'.`);
}

function buildDialectOptions() {
  if (!parseBoolean("MIGRATION_DB_SSL", false)) return {};

  const ssl = {
    require: true,
    rejectUnauthorized: parseBoolean(
      "MIGRATION_DB_SSL_REJECT_UNAUTHORIZED",
      true,
    ),
  };
  const caFile = process.env.MIGRATION_DB_SSL_CA_FILE;
  if (caFile) ssl.ca = fs.readFileSync(caFile, "utf8");

  return { ssl };
}

function buildMigrationConfig() {
  if (!process.env[URL_VARIABLE]) {
    throw new Error(
      `${URL_VARIABLE} é obrigatória; DATABASE_URL não é aceita como fallback.`,
    );
  }

  return {
    use_env_variable: URL_VARIABLE,
    dialect: "postgres",
    logging: false,
    dialectOptions: buildDialectOptions(),
    migrationStorage: "sequelize",
    migrationStorageTableName: METADATA_TABLE,
    migrationStorageTableSchema: METADATA_SCHEMA,
  };
}

module.exports = {
  migration: buildMigrationConfig(),
};

module.exports.__test = {
  URL_VARIABLE,
  METADATA_TABLE,
  METADATA_SCHEMA,
  buildDialectOptions,
  buildMigrationConfig,
  parseBoolean,
};
