#!/usr/bin/env bash
set -Eeuo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
default_project_root="$(cd -- "${script_directory}/.." && pwd)"
project_root="${default_project_root}"
run_user="${SUDO_USER:-ubuntu}"
enable_timer="false"

usage() {
  echo "Uso: sudo bash scripts/install_ec2.sh [--project-root CAMINHO] [--run-user USUARIO] [--enable-timer]"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root)
      project_root="$2"
      shift 2
      ;;
    --run-user)
      run_user="$2"
      shift 2
      ;;
    --enable-timer)
      enable_timer="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Argumento desconhecido: $1"
      usage
      exit 2
      ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Execute este instalador com sudo."
  exit 1
fi
if ! id "${run_user}" >/dev/null 2>&1; then
  echo "Usuário inexistente: ${run_user}"
  exit 1
fi
if [[ ! -f "${project_root}/run_daily.R" ]]; then
  echo "Projeto inválido: ${project_root}"
  exit 1
fi

project_root="$(cd -- "${project_root}" && pwd)"

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  awscli \
  build-essential \
  gdal-bin \
  libcurl4-openssl-dev \
  libgdal-dev \
  libgeos-dev \
  libnetcdf-dev \
  libproj-dev \
  libssl-dev \
  libudunits2-dev \
  libxml2-dev \
  python3 \
  python3-venv \
  r-base \
  r-base-dev \
  util-linux

python3 -m venv "${project_root}/.venv"
"${project_root}/.venv/bin/python" -m pip install --upgrade pip
"${project_root}/.venv/bin/python" -m pip install \
  -r "${project_root}/requirements-ec2.txt"

Rscript "${project_root}/scripts/install_r_packages.R"

mkdir -p \
  "${project_root}/data/daily" \
  "${project_root}/data/static" \
  "${project_root}/logs" \
  "${project_root}/outputs"
chmod 0750 "${project_root}/scripts/run_daily.sh"
chmod 0750 "${project_root}/scripts/download_daily_predictors.py"
chown -R "${run_user}:${run_user}" \
  "${project_root}/data" \
  "${project_root}/logs" \
  "${project_root}/outputs" \
  "${project_root}/.venv"

service_temporary="$(mktemp)"
sed \
  -e "s|@PROJECT_ROOT@|${project_root}|g" \
  -e "s|@RUN_USER@|${run_user}|g" \
  "${project_root}/systemd/siapesq-models-daily.service.template" \
  > "${service_temporary}"
install -m 0644 "${service_temporary}" \
  /etc/systemd/system/siapesq-models-daily.service
install -m 0644 \
  "${project_root}/systemd/siapesq-models-daily.timer" \
  /etc/systemd/system/siapesq-models-daily.timer

if [[ ! -f /etc/siapesq-models.env ]]; then
  environment_temporary="$(mktemp)"
  sed \
    -e "s|@PROJECT_ROOT@|${project_root}|g" \
    "${project_root}/.env.example" \
    > "${environment_temporary}"
  install -m 0600 "${environment_temporary}" /etc/siapesq-models.env
fi

systemctl daemon-reload

if [[ "${enable_timer}" == "true" ]]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/siapesq-models.env
  set +a
  required_values=(
    SDM_MIN_LONGITUDE
    SDM_MAX_LONGITUDE
    SDM_MIN_LATITUDE
    SDM_MAX_LATITUDE
    STATIC_DEPTH_FILE
  )
  for variable_name in "${required_values[@]}"; do
    if [[ -z "${!variable_name:-}" ]]; then
      echo "Preencha ${variable_name} em /etc/siapesq-models.env antes de habilitar."
      exit 1
    fi
  done
  if [[ ! -f "${STATIC_DEPTH_FILE}" ]]; then
    echo "Raster estático ausente: ${STATIC_DEPTH_FILE}"
    exit 1
  fi
  systemctl enable --now siapesq-models-daily.timer
  systemctl list-timers siapesq-models-daily.timer --no-pager
else
  echo "Instalação concluída."
  echo "Edite /etc/siapesq-models.env e depois execute:"
  echo "sudo systemctl enable --now siapesq-models-daily.timer"
fi
