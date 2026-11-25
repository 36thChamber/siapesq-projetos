#!/usr/bin/env node
"use strict";

require("ts-node/register/transpile-only");

const { Sequelize } = require("sequelize-typescript");
const { QueryTypes } = require("sequelize");
const { SIAPREPS_MODELS } = require("../src/orm/models");
const { buildModelManifest } = require("./inspect-model-schema.cjs");

const SCHEMA = "siapreps";

const TYPE_MAP = {
  BIGINT: ["bigint"],
  BOOLEAN: ["boolean"],
  DATE: ["timestamp with time zone"],
  FLOAT: ["double precision", "real"],
  INTEGER: ["integer"],
  JSONB: ["jsonb"],
  TEXT: ["text"],
  UUID: ["uuid"],
};

function columnKey(tableName, columnName) {
  return `${tableName}.${columnName}`;
}

function normalizePgArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.startsWith("{") || !value.endsWith("}")) {
    return value;
  }
  const content = value.slice(1, -1);
  return content ? content.split(",").map((item) => item.replace(/^"|"$/g, "")) : [];
}

function normalizeExpectedType(type) {
  if (type === "ENUM") return { dataTypes: ["USER-DEFINED"] };
  const varchar = /^VARCHAR\((\d+)\)$/.exec(type);
  if (varchar) {
    return {
      dataTypes: ["character varying"],
      characterMaximumLength: Number(varchar[1]),
    };
  }
  return { dataTypes: TYPE_MAP[type] || [type.toLowerCase()] };
}

function defaultMatches(expected, actual, attribute) {
  if (attribute.autoIncrement) return Boolean(actual?.includes("nextval"));
  if (expected === undefined) return actual === null;
  if (expected === "UUIDV4") return actual === null;
  // Sequelize evaluates these defaults in application code, not in PostgreSQL.
  if (expected === "NOW" || expected === "DATE_INSTANCE") return actual === null;
  if (expected === "true" || expected === "false") {
    return Boolean(actual && actual.toLowerCase().includes(expected));
  }
  if (/^-?\d+(\.\d+)?$/.test(String(expected))) {
    return Boolean(actual && actual.includes(String(expected)));
  }
  return Boolean(actual && actual.includes(`'${expected}'`));
}

async function inspectDatabase(sequelize) {
  const tables = await sequelize.query(
    `
      SELECT table_name
        FROM information_schema.tables
       WHERE table_schema = :schema
         AND table_type = 'BASE TABLE'
       ORDER BY table_name
    `,
    { replacements: { schema: SCHEMA }, type: QueryTypes.SELECT },
  );

  const columns = await sequelize.query(
    `
      SELECT table_name,
             column_name,
             data_type,
             udt_name,
             is_nullable,
             column_default,
             character_maximum_length
        FROM information_schema.columns
       WHERE table_schema = :schema
       ORDER BY table_name, ordinal_position
    `,
    { replacements: { schema: SCHEMA }, type: QueryTypes.SELECT },
  );

  const constraints = await sequelize.query(
    `
      SELECT tc.table_name,
             tc.constraint_name,
             tc.constraint_type,
             array_agg(kcu.column_name ORDER BY kcu.ordinal_position)::text AS columns
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON kcu.constraint_catalog = tc.constraint_catalog
         AND kcu.constraint_schema = tc.constraint_schema
         AND kcu.constraint_name = tc.constraint_name
       WHERE tc.table_schema = :schema
         AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
       GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
       ORDER BY tc.table_name, tc.constraint_name
    `,
    { replacements: { schema: SCHEMA }, type: QueryTypes.SELECT },
  );

  const foreignKeys = await sequelize.query(
    `
      SELECT tc.table_name,
             kcu.column_name,
             ccu.table_schema AS referenced_schema,
             ccu.table_name AS referenced_table,
             ccu.column_name AS referenced_column,
             rc.update_rule,
             rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON kcu.constraint_catalog = tc.constraint_catalog
         AND kcu.constraint_schema = tc.constraint_schema
         AND kcu.constraint_name = tc.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_catalog = tc.constraint_catalog
         AND ccu.constraint_schema = tc.constraint_schema
         AND ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_catalog = tc.constraint_catalog
         AND rc.constraint_schema = tc.constraint_schema
         AND rc.constraint_name = tc.constraint_name
       WHERE tc.table_schema = :schema
         AND tc.constraint_type = 'FOREIGN KEY'
       ORDER BY tc.table_name, kcu.column_name
    `,
    { replacements: { schema: SCHEMA }, type: QueryTypes.SELECT },
  );

  const indexes = await sequelize.query(
    `
      SELECT relation.relname AS table_name,
             index_relation.relname AS index_name,
             pg_index.indisunique AS is_unique,
             array_agg(attribute.attname ORDER BY key_position.ordinality)::text AS columns
        FROM pg_catalog.pg_index
        JOIN pg_catalog.pg_class AS relation
          ON relation.oid = pg_index.indrelid
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = relation.relnamespace
        JOIN pg_catalog.pg_class AS index_relation
          ON index_relation.oid = pg_index.indexrelid
        JOIN LATERAL unnest(pg_index.indkey)
          WITH ORDINALITY AS key_position(attribute_number, ordinality)
          ON true
        JOIN pg_catalog.pg_attribute AS attribute
          ON attribute.attrelid = relation.oid
         AND attribute.attnum = key_position.attribute_number
       WHERE namespace.nspname = :schema
         AND NOT pg_index.indisprimary
         AND NOT EXISTS (
           SELECT 1
             FROM pg_catalog.pg_constraint
            WHERE pg_constraint.conindid = index_relation.oid
         )
       GROUP BY relation.relname, index_relation.relname, pg_index.indisunique
       ORDER BY relation.relname, index_relation.relname
    `,
    { replacements: { schema: SCHEMA }, type: QueryTypes.SELECT },
  );

  const enums = await sequelize.query(
    `
      SELECT type.typname AS enum_name,
             array_agg(enum.enumlabel ORDER BY enum.enumsortorder)::text AS values
        FROM pg_catalog.pg_type AS type
        JOIN pg_catalog.pg_enum AS enum ON enum.enumtypid = type.oid
        JOIN pg_catalog.pg_namespace AS namespace
          ON namespace.oid = type.typnamespace
       WHERE namespace.nspname = :schema
       GROUP BY type.typname
       ORDER BY type.typname
    `,
    { replacements: { schema: SCHEMA }, type: QueryTypes.SELECT },
  );

  return { tables, columns, constraints, foreignKeys, indexes, enums };
}

function compareManifests(models, database) {
  const differences = [];
  const expectedTables = new Set(models.map((model) => model.table));
  const actualTables = new Set(database.tables.map((table) => table.table_name));

  for (const tableName of expectedTables) {
    if (!actualTables.has(tableName)) differences.push(`Tabela ausente: ${SCHEMA}.${tableName}`);
  }
  for (const tableName of actualTables) {
    if (!expectedTables.has(tableName)) differences.push(`Tabela extra: ${SCHEMA}.${tableName}`);
  }

  const actualColumns = new Map(
    database.columns.map((column) => [
      columnKey(column.table_name, column.column_name),
      column,
    ]),
  );

  for (const model of models) {
    const expectedColumnNames = new Set(Object.keys(model.columns));
    for (const [columnName, attribute] of Object.entries(model.columns)) {
      const key = columnKey(model.table, columnName);
      const actual = actualColumns.get(key);
      if (!actual) {
        differences.push(`Coluna ausente: ${SCHEMA}.${key}`);
        continue;
      }

      const expectedType = normalizeExpectedType(attribute.type);
      if (!expectedType.dataTypes.includes(actual.data_type)) {
        differences.push(
          `Tipo divergente em ${key}: model=${attribute.type}, banco=${actual.data_type}`,
        );
      }
      if (
        expectedType.characterMaximumLength &&
        Number(actual.character_maximum_length) !== expectedType.characterMaximumLength
      ) {
        differences.push(
          `Tamanho divergente em ${key}: model=${expectedType.characterMaximumLength}, banco=${actual.character_maximum_length}`,
        );
      }

      const expectedNullable = attribute.primaryKey ? false : attribute.allowNull;
      const actualNullable = actual.is_nullable === "YES";
      if (expectedNullable !== actualNullable) {
        differences.push(
          `Nulabilidade divergente em ${key}: model=${expectedNullable}, banco=${actualNullable}`,
        );
      }
      if (!defaultMatches(attribute.defaultValue, actual.column_default, attribute)) {
        differences.push(
          `Default divergente em ${key}: model=${attribute.defaultValue ?? "nenhum"}, banco=${actual.column_default ?? "nenhum"}`,
        );
      }
    }

    for (const actual of database.columns.filter(
      (column) => column.table_name === model.table,
    )) {
      if (!expectedColumnNames.has(actual.column_name)) {
        differences.push(`Coluna extra: ${SCHEMA}.${model.table}.${actual.column_name}`);
      }
    }
  }

  const primaryKeys = database.constraints.filter(
    (constraint) => constraint.constraint_type === "PRIMARY KEY",
  );
  const uniqueConstraints = database.constraints.filter(
    (constraint) => constraint.constraint_type === "UNIQUE",
  );
  for (const model of models) {
    const expectedPrimary = Object.entries(model.columns)
      .filter(([, attribute]) => attribute.primaryKey)
      .map(([columnName]) => columnName);
    const actualPrimary = primaryKeys.find(
      (constraint) => constraint.table_name === model.table,
    )?.columns;
    const normalizedPrimary = normalizePgArray(actualPrimary) || [];
    if (JSON.stringify(expectedPrimary) !== JSON.stringify(normalizedPrimary)) {
      differences.push(
        `PK divergente em ${model.table}: model=${expectedPrimary}, banco=${normalizedPrimary}`,
      );
    }

    for (const [columnName, attribute] of Object.entries(model.columns)) {
      if (!attribute.unique) continue;
      const exists = uniqueConstraints.some(
        (constraint) =>
          constraint.table_name === model.table &&
          JSON.stringify(normalizePgArray(constraint.columns)) ===
            JSON.stringify([columnName]),
      );
      if (!exists) differences.push(`Unique ausente: ${model.table}.${columnName}`);
    }
  }

  const expectedUniqueConstraints = new Set(
    models.flatMap((model) =>
      Object.entries(model.columns)
        .filter(([, attribute]) => attribute.unique)
        .map(([columnName]) => `${model.table}:${columnName}`),
    ),
  );
  for (const constraint of uniqueConstraints) {
    const columns = normalizePgArray(constraint.columns) || [];
    if (
      columns.length !== 1 ||
      !expectedUniqueConstraints.has(`${constraint.table_name}:${columns[0]}`)
    ) {
      differences.push(
        `Unique extra: ${constraint.table_name}.${columns.join(",")}`,
      );
    }
  }

  const actualForeignKeys = new Map(
    database.foreignKeys.map((foreignKey) => [
      columnKey(foreignKey.table_name, foreignKey.column_name),
      foreignKey,
    ]),
  );
  for (const model of models) {
    for (const [columnName, attribute] of Object.entries(model.columns)) {
      const key = columnKey(model.table, columnName);
      const actual = actualForeignKeys.get(key);
      if (!attribute.references) {
        if (actual) differences.push(`FK extra: ${key}`);
        continue;
      }
      if (!actual) {
        differences.push(`FK ausente: ${key}`);
        continue;
      }
      const expected = attribute.references;
      if (
        actual.referenced_schema !== expected.schema ||
        actual.referenced_table !== expected.table ||
        actual.referenced_column !== expected.key ||
        actual.update_rule !== attribute.onUpdate ||
        actual.delete_rule !== attribute.onDelete
      ) {
        differences.push(`FK divergente: ${key}`);
      }
    }
  }

  const actualIndexes = new Map(
    database.indexes.map((index) => [index.index_name, index]),
  );
  const expectedIndexNames = new Set();
  for (const model of models) {
    for (const expected of model.indexes) {
      expectedIndexNames.add(expected.name);
      const actual = actualIndexes.get(expected.name);
      if (!actual) {
        differences.push(`Índice ausente: ${expected.name}`);
        continue;
      }
      if (
        actual.table_name !== model.table ||
        Boolean(actual.is_unique) !== expected.unique ||
        JSON.stringify(normalizePgArray(actual.columns)) !==
          JSON.stringify(expected.fields)
      ) {
        differences.push(`Índice divergente: ${expected.name}`);
      }
    }
  }
  for (const indexName of actualIndexes.keys()) {
    if (!expectedIndexNames.has(indexName)) {
      differences.push(`Índice extra: ${indexName}`);
    }
  }

  const actualEnums = new Map(
    database.enums.map((item) => [item.enum_name, normalizePgArray(item.values)]),
  );
  for (const model of models) {
    for (const [columnName, attribute] of Object.entries(model.columns)) {
      if (attribute.type !== "ENUM") continue;
      const enumName = `enum_${model.table}_${columnName}`;
      const actualValues = actualEnums.get(enumName);
      if (JSON.stringify(actualValues || []) !== JSON.stringify(attribute.enumValues || [])) {
        differences.push(
          `Enum divergente: ${enumName} model=${attribute.enumValues || []}, banco=${actualValues || []}`,
        );
      }
    }
  }
  const expectedEnumNames = new Set(
    models.flatMap((model) =>
      Object.entries(model.columns)
        .filter(([, attribute]) => attribute.type === "ENUM")
        .map(([columnName]) => `enum_${model.table}_${columnName}`),
    ),
  );
  for (const enumName of actualEnums.keys()) {
    if (!expectedEnumNames.has(enumName)) {
      differences.push(`Enum extra: ${enumName}`);
    }
  }

  return differences;
}

async function compareSchema() {
  const migrationConfig = require("../config/database.cjs").migration;
  const databaseUrl = process.env[migrationConfig.use_env_variable];
  const sequelize = new Sequelize(databaseUrl, {
    dialect: "postgres",
    logging: false,
    dialectOptions: migrationConfig.dialectOptions,
    models: SIAPREPS_MODELS,
  });

  try {
    await sequelize.authenticate();
    const models = buildModelManifest();
    const database = await inspectDatabase(sequelize);
    const differences = compareManifests(models, database);
    return {
      differences,
      summary: {
        models: models.length,
        tables: database.tables.length,
        columns: database.columns.length,
        primaryKeys: database.constraints.filter(
          (constraint) => constraint.constraint_type === "PRIMARY KEY",
        ).length,
        foreignKeys: database.foreignKeys.length,
        uniqueConstraints: database.constraints.filter(
          (constraint) => constraint.constraint_type === "UNIQUE",
        ).length,
        indexes: database.indexes.length,
        enums: database.enums.length,
      },
    };
  } finally {
    await sequelize.close();
  }
}

async function main() {
  const result = await compareSchema();
  if (result.differences.length) {
    process.stderr.write("Divergências models × PostgreSQL:\n");
    for (const difference of result.differences) {
      process.stderr.write(`- ${difference}\n`);
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Schema ${SCHEMA} compatível com os models: ${JSON.stringify(result.summary)}\n`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Falha ao comparar schema: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  compareManifests,
  compareSchema,
  defaultMatches,
  inspectDatabase,
  normalizeExpectedType,
  normalizePgArray,
};
