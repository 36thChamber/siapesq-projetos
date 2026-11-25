const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const docsDirectory = path.resolve(__dirname, "..", "docs");
const sourcePath = path.join(docsDirectory, "openapi.yaml");
const outputPath = path.join(docsDirectory, "openapi-bundled.yaml");

function loadYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, "utf8"), {
    schema: yaml.JSON_SCHEMA,
  });
}

function selectPointer(document, fragment, ref) {
  if (!fragment) return document;

  const pointer = decodeURIComponent(fragment.slice(1));
  if (!pointer.startsWith("/")) {
    throw new Error(`Unsupported reference fragment in ${ref}`);
  }

  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((value, key) => {
      if (value == null || !Object.hasOwn(value, key)) {
        throw new Error(`Reference target not found: ${ref}`);
      }
      return value[key];
    }, document);
}

function readExternalReference(ref, ownerPath) {
  const hashIndex = ref.indexOf("#");
  const fileReference = hashIndex === -1 ? ref : ref.slice(0, hashIndex);
  if (!fileReference) {
    throw new Error(`Expected an external file reference: ${ref}`);
  }

  const targetPath = path.resolve(path.dirname(ownerPath), fileReference);
  const document = loadYaml(targetPath);
  const fragment = hashIndex === -1 ? "" : ref.slice(hashIndex);
  return {
    target: selectPointer(document, fragment, ref),
    targetPath,
  };
}

function componentPointer(targetPath) {
  const relativePath = path.relative(
    path.join(docsDirectory, "components"),
    targetPath,
  );
  const parts = relativePath.split(path.sep);
  if (parts.length < 2 || parts[0] === "..") return undefined;

  const componentType = parts[0];
  const componentName = path.basename(targetPath, path.extname(targetPath));
  return `#/components/${componentType}/${componentName}`;
}

function resolveNestedReferences(value, ownerPath) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveNestedReferences(item, ownerPath));
  }
  if (value === null || typeof value !== "object") return value;

  if (typeof value.$ref === "string" && !value.$ref.startsWith("#/")) {
    const { target, targetPath } = readExternalReference(value.$ref, ownerPath);
    const pointer = componentPointer(targetPath);
    if (pointer) return { ...value, $ref: pointer };
    return resolveNestedReferences(target, targetPath);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      resolveNestedReferences(nested, ownerPath),
    ]),
  );
}

function resolveTopLevelReference(value, ownerPath) {
  if (typeof value?.$ref !== "string" || value.$ref.startsWith("#/")) {
    return resolveNestedReferences(value, ownerPath);
  }

  const { target, targetPath } = readExternalReference(value.$ref, ownerPath);
  return resolveNestedReferences(target, targetPath);
}

function validateInternalReferences(value, document, owner = "OpenAPI") {
  if (Array.isArray(value)) {
    value.forEach((item) => validateInternalReferences(item, document, owner));
    return;
  }
  if (value === null || typeof value !== "object") return;

  if (typeof value.$ref === "string") {
    if (!value.$ref.startsWith("#/")) {
      throw new Error(`Unbundled reference in ${owner}: ${value.$ref}`);
    }
    selectPointer(document, value.$ref, value.$ref);
  }

  Object.entries(value).forEach(([key, nested]) =>
    validateInternalReferences(nested, document, `${owner}.${key}`),
  );
}

function bundleOpenApi() {
  const source = loadYaml(sourcePath);
  const bundled = { ...source, paths: {}, components: {} };

  for (const [route, pathItem] of Object.entries(source.paths ?? {})) {
    bundled.paths[route] = resolveTopLevelReference(pathItem, sourcePath);
  }

  for (const [componentType, entries] of Object.entries(
    source.components ?? {},
  )) {
    bundled.components[componentType] = {};
    for (const [name, component] of Object.entries(entries ?? {})) {
      bundled.components[componentType][name] = resolveTopLevelReference(
        component,
        sourcePath,
      );
    }
  }

  validateInternalReferences(bundled, bundled);

  fs.writeFileSync(
    outputPath,
    yaml.dump(bundled, {
      lineWidth: 120,
      noRefs: true,
      schema: yaml.JSON_SCHEMA,
    }),
    "utf8",
  );
  console.log(`OpenAPI bundle generated: ${path.relative(process.cwd(), outputPath)}`);
}

bundleOpenApi();
