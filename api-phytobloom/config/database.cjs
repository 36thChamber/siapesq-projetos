const fs = require("fs");
require("dotenv").config();

function requiredMigrationUrl() {
  const value = process.env.MIGRATION_DATABASE_URL;

  if (!value) {
    throw new Error(
      "MIGRATION_DATABASE_URL deve ser definida para executar migrations.",
    );
  }

  return value;
}

function isTrue(name) {
  return process.env[name]?.toLowerCase() === "true";
}

function buildDialectOptions() {
  if (!isTrue("MIGRATION_DB_SSL")) {
    return {};
  }

  const rejectUnauthorized =
    process.env.MIGRATION_DB_SSL_REJECT_UNAUTHORIZED === undefined
      ? true
      : isTrue("MIGRATION_DB_SSL_REJECT_UNAUTHORIZED");

  const ssl = { rejectUnauthorized };
  const caFile = process.env.MIGRATION_DB_SSL_CA_FILE;

  if (caFile) {
    ssl.ca = fs.readFileSync(caFile, "utf8");
  }

  return { ssl };
}

const migrationConfig = {
  url: requiredMigrationUrl(),
  dialect: "postgres",
  migrationStorage: "sequelize",
  migrationStorageTableName: "SequelizeMetaPhytobloom",
  migrationStorageTableSchema: "public",
  dialectOptions: buildDialectOptions(),
  logging: false,
};

module.exports = {
  development: migrationConfig,
  test: migrationConfig,
  production: migrationConfig,
};
