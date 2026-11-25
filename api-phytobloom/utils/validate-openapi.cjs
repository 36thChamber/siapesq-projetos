const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const root = path.resolve(__dirname, "..");
const doc = yaml.load(fs.readFileSync(path.join(root, "docs/openapi-bundled.yaml"), "utf8"));
const resolve = (value) => value.$ref?.startsWith("#/")
  ? value.$ref.slice(2).split("/").reduce((part, key) => part[key], doc)
  : value;
const routerSource = fs.readFileSync(path.join(root, "src/routes/router.ts"), "utf8");
const imports = new Map(
  [...routerSource.matchAll(/import\s+(\w+)\s+from\s+"\.\/([^\"]+)"/g)].map(
    ([, name, file]) => [name, file],
  ),
);
const mounts = [...routerSource.matchAll(/router\.use\("([^"]+)",\s*(\w+)\)/g)];
const routes = new Set(["GET /health"]);

for (const [, prefix, name] of mounts) {
  const file = imports.get(name);
  if (!file) throw new Error(`Router não encontrado: ${name}`);
  const source = fs.readFileSync(path.join(root, "src/routes", `${file}.ts`), "utf8");
  for (const [, method, suffix] of source.matchAll(/router\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g)) {
    const routePath = `${prefix === "/" ? "" : prefix}${suffix === "/" ? "" : suffix}` || "/";
    routes.add(`${method.toUpperCase()} ${routePath.replace(/:([A-Za-z_]+)/g, "{$1}")}`);
  }
}

const documented = new Set();
const operationIds = new Set();
for (const [routePath, item] of Object.entries(doc.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
    const key = `${method.toUpperCase()} ${routePath}`;
    documented.add(key);
    if (!operation.operationId || operationIds.has(operation.operationId)) {
      throw new Error(`operationId ausente ou duplicado: ${key}`);
    }
    operationIds.add(operation.operationId);
    if (!Array.isArray(operation.security)) throw new Error(`security ausente: ${key}`);
    for (const parameter of routePath.matchAll(/\{([^}]+)\}/g)) {
      if (!operation.parameters?.some((entry) => {
        const p = resolve(entry);
        return p.name === parameter[1] && p.in === "path" && p.required;
      })) {
        throw new Error(`Parâmetro de path ausente: ${key} ${parameter[1]}`);
      }
    }
    for (const requirement of operation.security) {
      for (const scheme of Object.keys(requirement)) {
        if (!doc.components.securitySchemes[scheme]) throw new Error(`security scheme ausente: ${key} ${scheme}`);
      }
    }
  }
}

const missing = [...routes].filter((key) => !documented.has(key));
const extra = [...documented].filter((key) => !routes.has(key));
if (missing.length || extra.length) {
  throw new Error(`Inventário divergente. Ausentes: ${missing.join(", ") || "nenhum"}. Extras: ${extra.join(", ") || "nenhum"}`);
}
if (doc.servers?.length !== 1 || doc.servers[0].url !== "/") {
  throw new Error("Swagger deve usar a mesma origem da API");
}
console.log(`${routes.size} operações verificadas; paths, operationIds e esquemas de segurança válidos.`);
