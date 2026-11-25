const PRODUCTION_API_URL_ERROR =
  "API_URL deve ser definida com uma URL HTTP(S) válida em produção.";

function normalizeApiUrl(value, variableName = "API_URL") {
  if (!value || !value.trim()) {
    throw new Error(
      `${variableName} deve ser definida com uma URL HTTP(S) válida.`,
    );
  }

  const normalizedValue = value.trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(normalizedValue);
  } catch {
    throw new Error(
      `${variableName} deve ser definida com uma URL HTTP(S) válida.`,
    );
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(
      `${variableName} deve ser definida com uma URL HTTP(S) válida.`,
    );
  }

  return normalizedValue.replace(/\/+$/, "");
}

function getProductionApiUrl() {
  const value = process.env.API_URL;
  if (!value || !value.trim()) {
    throw new Error(PRODUCTION_API_URL_ERROR);
  }

  try {
    return normalizeApiUrl(value);
  } catch {
    throw new Error(PRODUCTION_API_URL_ERROR);
  }
}

module.exports = {
  getProductionApiUrl,
  normalizeApiUrl,
};
