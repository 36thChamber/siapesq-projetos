#!/usr/bin/env bash
set -Eeuo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="${MODELS_PROJECT_ROOT:-$(cd -- "${script_directory}/.." && pwd)}"
environment_file="${MODELS_ENV_FILE:-/etc/siapesq-models.env}"

if [[ -f "${environment_file}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${environment_file}"
  set +a
elif [[ -f "${project_root}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${project_root}/.env"
  set +a
fi

project_root="${MODELS_PROJECT_ROOT:-${project_root}}"
python_executable="${project_root}/.venv/bin/python"
daily_root="${project_root}/data/daily"
lock_file="${project_root}/data/daily-run.lock"

mkdir -p "${daily_root}" "${project_root}/outputs" "${project_root}/logs"
exec 9>"${lock_file}"
if ! flock -n 9; then
  echo "Outra execução diária já está ativa; encerrando sem duplicar o processo."
  exit 0
fi

if [[ "${DOWNLOAD_PREDICTORS:-true}" == "true" ]]; then
  if [[ ! -x "${python_executable}" ]]; then
    echo "Ambiente Python ausente: ${python_executable}"
    exit 1
  fi
  if [[ -z "${STATIC_DEPTH_FILE:-}" ]]; then
    echo "STATIC_DEPTH_FILE não foi definido."
    exit 1
  fi

  "${python_executable}" "${project_root}/scripts/download_daily_predictors.py" \
    --output-root "${daily_root}" \
    --depth-file "${STATIC_DEPTH_FILE}" \
    --target-date auto
fi

current_predictors="$(readlink -f "${daily_root}/current")"
if [[ ! -d "${current_predictors}" ]]; then
  echo "Pasta atual de preditores não encontrada: ${daily_root}/current"
  exit 1
fi
prediction_date="$(basename -- "${current_predictors}")"
export DAILY_PREDICTORS_DIR="${current_predictors}"

Rscript "${project_root}/run_daily.R" \
  --project-root "${project_root}" \
  --predictors "${current_predictors}" \
  --date "${prediction_date}"

if [[ -n "${S3_OUTPUT_URI:-}" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "S3_OUTPUT_URI foi definido, mas o AWS CLI não está instalado."
    exit 1
  fi
  aws s3 sync \
    "${project_root}/outputs/${prediction_date}" \
    "${S3_OUTPUT_URI%/}/${prediction_date}/" \
    --only-show-errors
fi

echo "Execução diária concluída para ${prediction_date}."
