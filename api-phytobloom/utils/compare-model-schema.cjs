require("reflect-metadata");
require("dotenv").config();
require("ts-node/register/transpile-only");

const { Sequelize } = require("sequelize-typescript");
const { QueryTypes } = require("sequelize");
const Usuarios = require("../src/models/Usuarios").default;
const Reservatorios = require("../src/models/Reservatorios").default;
const AreasAlertas = require("../src/models/AreasAlertas").default;
const Alertas = require("../src/models/Alertas").default;

const SCHEMA = "phytobloom";
const MODELS = [Usuarios, Reservatorios, AreasAlertas, Alertas];

function migrationUrl() {
  if (!process.env.MIGRATION_DATABASE_URL) {
    throw new Error(
      "MIGRATION_DATABASE_URL deve ser definida para comparar o schema.",
    );
  }

  return process.env.MIGRATION_DATABASE_URL;
}

function normalizeType(value) {
  return String(value)
    .toUpperCase()
    .replace(/CHARACTER VARYING/g, "VARCHAR")
    .replace(/^NUMERIC$/, "DECIMAL")
    .replace(/\s+/g, " ")
    .trim();
}

function hasDefault(value) {
  return value !== undefined && value !== null;
}

async function main() {
  const sequelize = new Sequelize(migrationUrl(), {
    dialect: "postgres",
    logging: false,
  });
  sequelize.addModels(MODELS);

  const queryInterface = sequelize.getQueryInterface();
  const report = { schema: SCHEMA, tables: [], differences: [] };

  try {
    for (const Model of MODELS) {
      const tableName = Model.getTableName().tableName;
      const table = { tableName, schema: SCHEMA };
      const description = await queryInterface.describeTable(table);
      const indexes = await queryInterface.showIndex(table);
      const foreignKeys = await sequelize.query(
        `
          SELECT
            tc.constraint_name AS "constraintName",
            kcu.column_name AS "columnName",
            ccu.table_name AS "referencedTableName",
            ccu.column_name AS "referencedColumnName",
            rc.delete_rule AS "onDelete",
            rc.update_rule AS "onUpdate"
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
            AND tc.table_name = kcu.table_name
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
            AND tc.constraint_schema = rc.constraint_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = :schema
            AND tc.table_name = :tableName
          ORDER BY tc.constraint_name
        `,
        {
          replacements: { schema: SCHEMA, tableName },
          type: QueryTypes.SELECT,
        },
      );
      const attributes = Model.getAttributes();
      const tableReport = {
        tableName,
        columns: Object.keys(description).length,
        indexes: indexes.map((index) => index.name),
        foreignKeys: foreignKeys.map((foreignKey) => ({
          constraintName: foreignKey.constraintName,
          columnName: foreignKey.columnName,
          referencedTableName: foreignKey.referencedTableName,
          referencedColumnName: foreignKey.referencedColumnName,
          onDelete: foreignKey.onDelete,
          onUpdate: foreignKey.onUpdate,
        })),
      };
      report.tables.push(tableReport);

      for (const [attributeName, attribute] of Object.entries(attributes)) {
        const columnName = attribute.field || attributeName;
        const actual = description[columnName];

        if (!actual) {
          report.differences.push(`${tableName}.${columnName}: coluna ausente`);
          continue;
        }

        const expectedType = normalizeType(attribute.type.toSql());
        const actualType = normalizeType(actual.type);
        if (expectedType !== actualType) {
          report.differences.push(
            `${tableName}.${columnName}: tipo model=${expectedType} banco=${actualType}`,
          );
        }
        if (attribute.primaryKey && !actual.primaryKey) {
          report.differences.push(`${tableName}.${columnName}: PK ausente`);
        }
        if (attribute.allowNull === false && actual.allowNull) {
          report.differences.push(
            `${tableName}.${columnName}: nulabilidade deveria ser NOT NULL`,
          );
        }
        if (hasDefault(attribute.defaultValue) && !hasDefault(actual.defaultValue)) {
          report.differences.push(
            `${tableName}.${columnName}: default ausente no banco`,
          );
        }
      }

      for (const expectedIndex of Model.options.indexes || []) {
        const expectedFields = (expectedIndex.fields || []).map((field) =>
          typeof field === "string" ? field : field.attribute || field.name,
        );
        const matches = indexes.some((index) => {
          const actualFields = index.fields.map((field) => field.attribute || field.name);
          return (
            JSON.stringify(actualFields) === JSON.stringify(expectedFields) &&
            Boolean(index.unique) === Boolean(expectedIndex.unique)
          );
        });

        if (!matches) {
          report.differences.push(
            `${tableName}: índice ausente ${expectedIndex.name} (${expectedFields.join(", ")})`,
          );
        }
      }

      for (const [uniqueName, unique] of Object.entries(
        Model.options.uniqueKeys || {},
      )) {
        const expectedFields = unique.fields || [];
        const matches = indexes.some((index) => {
          const actualFields = index.fields.map((field) => field.attribute || field.name);
          return (
            Boolean(index.unique) &&
            JSON.stringify(actualFields) === JSON.stringify(expectedFields)
          );
        });

        if (!matches) {
          report.differences.push(
            `${tableName}: unique ausente ${uniqueName} (${expectedFields.join(", ")})`,
          );
        }
      }

      for (const association of Object.values(Model.associations)) {
        if (association.associationType !== "BelongsTo") {
          continue;
        }

        const foreignKey = association.foreignKey;
        const referencedTableName =
          association.target.getTableName().tableName;
        const exists = foreignKeys.some(
          (reference) =>
            reference.columnName === foreignKey &&
            reference.referencedTableName === referencedTableName &&
            reference.referencedColumnName === "id",
        );

        if (!exists) {
          report.differences.push(
            `${tableName}.${foreignKey}: FK ausente para ${referencedTableName}.id`,
          );
        }
      }
    }
  } finally {
    await sequelize.close();
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.differences.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
