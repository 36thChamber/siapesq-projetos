// split-openapiV2.js - Versão final corrigida
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// CONFIGURAÇÃO
const inputFile = path.join(__dirname, '..', 'docs', 'openapi.yaml');
const outputDir = path.join(__dirname, '..', 'docs');
const CONFIG_FILE = path.join(__dirname, 'split-config.json');
let config = {};

// Estrutura de diretórios
const directories = {
  components: path.join(outputDir, 'components'),
  schemas: path.join(outputDir, 'components', 'schemas'),
  parameters: path.join(outputDir, 'components', 'parameters'),
  responses: path.join(outputDir, 'components', 'responses'),
  securitySchemes: path.join(outputDir, 'components', 'securitySchemes'),
  paths: path.join(outputDir, 'paths')
};

// Mapeamento de schemas por categoria
const schemaCategories = {
  'StatusUsuario': 'enums',
  'TipoUsuario': 'enums',
  'StatusAssinatura': 'enums',
  'StatusPagamento': 'enums',
  'ProvedorPagamento': 'enums',
  'Usuario': 'usuarios',
  'UsuarioInput': 'usuarios',
  'UsuarioUpdate': 'usuarios',
  'UsuarioResponse': 'usuarios',
  'Especie': 'especies',
  'EspecieInput': 'especies',
  'EspecieResponse': 'especies',
  'EspecieDetalhada': 'especies',
  'EspecieDetalhadaResponse': 'especies',
  'GrupoEspecies': 'grupos-especies',
  'GrupoEspeciesInput': 'grupos-especies',
  'GrupoEspeciesResponse': 'grupos-especies',
  'InformacaoEspecie': 'informacoes-especies',
  'InformacaoEspecieInput': 'informacoes-especies',
  'InformacaoEspecieResponse': 'informacoes-especies',
  'Analise': 'analises',
  'AnaliseInput': 'analises',
  'AnaliseResponse': 'analises',
  'Artigo': 'artigos',
  'ArtigoInput': 'artigos',
  'ArtigoResponse': 'artigos',
  'Plano': 'planos',
  'PlanoInput': 'planos',
  'PlanoResponse': 'planos',
  'Assinatura': 'assinaturas',
  'AssinaturaInput': 'assinaturas',
  'AssinaturaUpdate': 'assinaturas',
  'AssinaturaResponse': 'assinaturas',
  'Pagamento': 'pagamentos',
  'PagamentoInput': 'pagamentos',
  'PagamentoUpdate': 'pagamentos',
  'PagamentoResponse': 'pagamentos',
  'PaginatedResponse': 'utils',
  'ErrorResponse': 'utils'
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  📁 Criado: ${dirPath}`);
  }
}

function sanitizeFileName(str) {
  return str.replace(/\//g, '_').replace(/[{}]/g, '').replace(/^_/, '');
}

// ============================================================
// CONVERSÃO DE REFERÊNCIAS COM BASE NO CONTEXTO
// ============================================================
// context: 'schema', 'response', 'parameter', 'securityScheme', 'path'
function convertRefs(obj, context) {
  if (!obj || typeof obj !== 'object') return obj;

  function transform(value) {
    if (typeof value === 'string' && value.startsWith('#/components/')) {
      const parts = value.split('/');
      if (parts.length >= 3) {
        const componentType = parts[2];
        const componentName = parts[3];

        // Gera caminho relativo baseado no contexto atual
        if (componentType === 'parameters') {
          if (context === 'path') return `../../components/parameters/${componentName}.yaml`;
          return `../parameters/${componentName}.yaml`;
        }
        if (componentType === 'responses') {
          if (context === 'path') return `../../components/responses/${componentName}.yaml`;
          return `../responses/${componentName}.yaml`;
        }
        if (componentType === 'securitySchemes') {
          if (context === 'path') return `../../components/securitySchemes/${componentName}.yaml`;
          return `../securitySchemes/${componentName}.yaml`;
        }
        if (componentType === 'schemas') {
          const category = schemaCategories[componentName] || 'outros';
          if (context === 'path') {
            return `../../components/schemas/${category}/${componentName}.yaml`;
          }
          if (context === 'schema') {
            // A partir de components/schemas/categoria/:
            // para acessar outro schema, sobe um nível (../) e desce para a categoria
            return `../${category}/${componentName}.yaml`;
          }
          if (context === 'response' || context === 'parameter' || context === 'securityScheme') {
            // A partir de components/responses/ (ou parameters, securitySchemes):
            // sobe um nível para components/ e desce para schemas/categoria
            return `../schemas/${category}/${componentName}.yaml`;
          }
        }
      }
    }
    return value;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertRefs(item, context));
  }
  const newObj = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === '$ref' && typeof val === 'string' && val.startsWith('#/components/')) {
      newObj[key] = transform(val);
    } else {
      newObj[key] = convertRefs(val, context);
    }
  }
  return newObj;
}

// ============================================================
// EXECUÇÃO
// ============================================================
console.log('📁 Criando estrutura de diretórios...');
Object.values(directories).forEach(dir => ensureDir(dir));

if (!fs.existsSync(inputFile)) {
  console.error(`\n❌ Arquivo não encontrado: ${inputFile}`);
  process.exit(1);
}

console.log(`\n📖 Lendo arquivo: ${inputFile}`);
let spec;
try {
  const content = fs.readFileSync(inputFile, 'utf8');
  spec = yaml.load(content, { schema: yaml.JSON_SCHEMA });
  console.log('  ✓ Arquivo lido com sucesso');
} catch (error) {
  console.error(`\n❌ Erro ao ler YAML: ${error.message}`);
  process.exit(1);
}

// 1. Security Schemes
console.log('\n🔐 Extraindo securitySchemes...');
if (spec.components?.securitySchemes) {
  const securityDir = directories.securitySchemes;
  for (const [name, content] of Object.entries(spec.components.securitySchemes)) {
    const converted = convertRefs(content, 'securityScheme');
    const filePath = path.join(securityDir, `${name}.yaml`);
    fs.writeFileSync(filePath, yaml.dump(converted, { lineWidth: -1, schema: yaml.JSON_SCHEMA }));
    console.log(`  ✓ ${name}.yaml`);
  }
}

// 2. Parameters
console.log('\n📌 Extraindo parameters...');
if (spec.components?.parameters) {
  const paramsDir = directories.parameters;
  for (const [name, content] of Object.entries(spec.components.parameters)) {
    const converted = convertRefs(content, 'parameter');
    const filePath = path.join(paramsDir, `${name}.yaml`);
    fs.writeFileSync(filePath, yaml.dump(converted, { lineWidth: -1, schema: yaml.JSON_SCHEMA }));
    console.log(`  ✓ ${name}.yaml`);
  }
}

// 3. Responses
console.log('\n📝 Extraindo responses...');
if (spec.components?.responses) {
  const responsesDir = directories.responses;
  for (const [name, content] of Object.entries(spec.components.responses)) {
    const converted = convertRefs(content, 'response');
    const filePath = path.join(responsesDir, `${name}.yaml`);
    fs.writeFileSync(filePath, yaml.dump(converted, { lineWidth: -1, schema: yaml.JSON_SCHEMA }));
    console.log(`  ✓ ${name}.yaml`);
  }
}

// 4. Schemas
console.log('\n📦 Extraindo schemas...');
const schemasByCategory = {};
if (spec.components?.schemas) {
  for (const [name, content] of Object.entries(spec.components.schemas)) {
    const category = schemaCategories[name] || 'outros';
    if (!schemasByCategory[category]) schemasByCategory[category] = [];
    schemasByCategory[category].push({ name, content });
  }

  for (const [category, items] of Object.entries(schemasByCategory)) {
    const categoryDir = path.join(directories.schemas, category);
    ensureDir(categoryDir);
    for (const item of items) {
      const converted = convertRefs(item.content, 'schema');
      const filePath = path.join(categoryDir, `${item.name}.yaml`);
      fs.writeFileSync(filePath, yaml.dump(converted, { lineWidth: -1, schema: yaml.JSON_SCHEMA }));
      console.log(`  ✓ ${category}/${item.name}.yaml`);
    }
  }
}

// 5. Paths
console.log('\n🛣️  Extraindo paths...');
const pathsByCategory = {};
for (const [pathUrl, methods] of Object.entries(spec.paths)) {
  let category = 'outros';
  if (pathUrl.includes('/usuarios')) category = 'usuarios';
  else if (pathUrl.includes('/grupos-especies')) category = 'grupos-especies';
  else if (pathUrl.includes('/especies')) category = 'especies';
  else if (pathUrl.includes('/informacoes-especies')) category = 'informacoes-especies';
  else if (pathUrl.includes('/analises')) category = 'analises';
  else if (pathUrl.includes('/artigos')) category = 'artigos';
  else if (pathUrl.includes('/planos')) category = 'planos';
  else if (pathUrl.includes('/assinaturas')) category = 'assinaturas';
  else if (pathUrl.includes('/pagamentos')) category = 'pagamentos';

  if (!pathsByCategory[category]) pathsByCategory[category] = {};
  pathsByCategory[category][pathUrl] = methods;
}

for (const [category, paths] of Object.entries(pathsByCategory)) {
  const categoryDir = path.join(directories.paths, category);
  ensureDir(categoryDir);
  for (const [pathUrl, methods] of Object.entries(paths)) {
    const converted = convertRefs(methods, 'path');
    const fileName = sanitizeFileName(pathUrl);
    const filePath = path.join(categoryDir, `${fileName}.yaml`);
    fs.writeFileSync(filePath, yaml.dump(converted, { lineWidth: -1, schema: yaml.JSON_SCHEMA }));
    console.log(`  ✓ ${category}/${fileName}.yaml (${pathUrl})`);
  }
}

// 6. Arquivo principal openapi.yaml
console.log('\n📄 Criando arquivo principal openapi.yaml...');
const mainSpec = {
  openapi: spec.openapi,
  info: spec.info,
  servers: spec.servers,
  security: spec.security || [],
  tags: spec.tags || [],
  paths: {},
  components: {
    securitySchemes: {},
    parameters: {},
    responses: {},
    schemas: {}
  }
};

if (spec.components?.securitySchemes) {
  for (const name of Object.keys(spec.components.securitySchemes)) {
    mainSpec.components.securitySchemes[name] = { $ref: `./components/securitySchemes/${name}.yaml` };
  }
}
if (spec.components?.parameters) {
  for (const name of Object.keys(spec.components.parameters)) {
    mainSpec.components.parameters[name] = { $ref: `./components/parameters/${name}.yaml` };
  }
}
if (spec.components?.responses) {
  for (const name of Object.keys(spec.components.responses)) {
    mainSpec.components.responses[name] = { $ref: `./components/responses/${name}.yaml` };
  }
}
if (spec.components?.schemas) {
  for (const name of Object.keys(spec.components.schemas)) {
    const category = schemaCategories[name] || 'outros';
    mainSpec.components.schemas[name] = { $ref: `./components/schemas/${category}/${name}.yaml` };
  }
}
for (const [pathUrl] of Object.entries(spec.paths)) {
  let category = 'outros';
  if (pathUrl.includes('/usuarios')) category = 'usuarios';
  else if (pathUrl.includes('/grupos-especies')) category = 'grupos-especies';
  else if (pathUrl.includes('/especies')) category = 'especies';
  else if (pathUrl.includes('/informacoes-especies')) category = 'informacoes-especies';
  else if (pathUrl.includes('/analises')) category = 'analises';
  else if (pathUrl.includes('/artigos')) category = 'artigos';
  else if (pathUrl.includes('/planos')) category = 'planos';
  else if (pathUrl.includes('/assinaturas')) category = 'assinaturas';
  else if (pathUrl.includes('/pagamentos')) category = 'pagamentos';
  const fileName = sanitizeFileName(pathUrl);
  mainSpec.paths[pathUrl] = { $ref: `./paths/${category}/${fileName}.yaml` };
}

const indexPath = path.join(outputDir, 'openapi.yaml');
fs.writeFileSync(indexPath, yaml.dump(mainSpec, { lineWidth: -1, schema: yaml.JSON_SCHEMA }));
console.log('  ✓ openapi.yaml criado com sucesso!');

console.log('\n' + '='.repeat(70));
console.log('✅ DIVISÃO CONCLUÍDA COM SUCESSO!');
console.log('='.repeat(70));
console.log('\n🔍 Para validar a estrutura (dentro da pasta docs):');
console.log('   cd docs && npx @redocly/cli lint openapi.yaml\n');