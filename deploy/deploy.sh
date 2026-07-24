#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/deploy/.env"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "${ENV_FILE}")

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Hata: deploy/.env bulunamadı."
  echo "  cp deploy/.env.production.example deploy/.env"
  echo "  nano deploy/.env"
  exit 1
fi

wait_for_postgres() {
  local user="${1:-kilic}"
  local attempt status

  for attempt in $(seq 1 40); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' kiliccoffee-prod-postgres 2>/dev/null || echo missing)"
    if [[ "${status}" == "healthy" ]] \
      || "${COMPOSE[@]}" exec -T postgres pg_isready -U "${user}" >/dev/null 2>&1; then
      echo "Postgres hazır (${attempt}. deneme, durum: ${status})."
      return 0
    fi
    if [[ "${attempt}" -eq 40 ]]; then
      echo "Hata: Postgres 80s içinde healthy olmadı."
      docker logs kiliccoffee-prod-postgres --tail 40 2>&1 || true
      return 1
    fi
    sleep 2
  done
}

wait_for_health() {
  local port="${1:-3202}"
  local path="${2:-/health}"
  local max_attempts="${3:-40}"
  local attempt=1

  while (( attempt <= max_attempts )); do
    if curl -fsS "http://127.0.0.1:${port}${path}" >/dev/null 2>&1; then
      echo "API hazır (${attempt}. deneme)."
      curl -fsS "http://127.0.0.1:${port}${path}" && echo ""
      return 0
    fi
    echo "API bekleniyor... (${attempt}/${max_attempts})"
    sleep 3
    ((attempt++))
  done

  echo "Hata: API ${max_attempts} denemede ayağa kalkmadı."
  docker logs kiliccoffee-prod-api --tail 80 2>&1 || true
  return 1
}

ensure_swap() {
  local swap_mb
  swap_mb="$(free -m | awk '/Swap:/{print $2}')"
  if [[ "${swap_mb}" -ge 1024 ]]; then
    echo "Swap OK (${swap_mb}M)."
    return 0
  fi
  if [[ -f /swapfile ]]; then
    swapon /swapfile 2>/dev/null || true
    return 0
  fi
  if [[ "${EUID}" -ne 0 ]]; then
    echo "UYARI: Swap yok ve root değil — OOM riski yüksek."
    return 0
  fi
  echo "==> Swap yok — 2G /swapfile oluşturuluyor (OOM önleme)..."
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
}

cd "${ROOT_DIR}"

echo "==> Kılıç Coffee production deploy: $(date -Is)"

export COMPOSE_PARALLEL_LIMIT=1
export DOCKER_BUILDKIT=1
export BUILDKIT_STEP_LOG_MAX_SIZE=10485760
export BUILDKIT_STEP_LOG_MAX_SPEED=10485760

ensure_swap

POSTGRES_USER="$(grep '^POSTGRES_USER=' "${ENV_FILE}" | cut -d= -f2)"
POSTGRES_USER="${POSTGRES_USER:-kilic}"

echo "==> Postgres..."
"${COMPOSE[@]}" up -d postgres
wait_for_postgres "${POSTGRES_USER}"

echo "==> Redis..."
"${COMPOSE[@]}" up -d redis

echo "==> Servisler sırayla build (RAM dostu)..."
for service in api frontend admin; do
  echo "--- build: ${service} ($(date -Is))"
  echo "    free: $(free -m | awk '/Mem:/{print $7}')M available"
  "${COMPOSE[@]}" build "${service}"
  # Ara cache temizliği — sonraki build için RAM/disk
  docker builder prune -f --keep-storage 2GB >/dev/null 2>&1 || true
done

echo "==> Uygulama container'ları..."
"${COMPOSE[@]}" up -d --no-build --force-recreate api frontend admin

echo "==> Frontend hazır bekleniyor..."
FRONTEND_PORT="$(grep '^FRONTEND_HOST_PORT=' "${ENV_FILE}" | cut -d= -f2)"
FRONTEND_PORT="${FRONTEND_PORT:-3200}"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${FRONTEND_PORT}/" >/dev/null 2>&1; then
    echo "Frontend hazır (${i}. deneme)."
    break
  fi
  if [[ "${i}" -eq 30 ]]; then
    echo "UYARI: Frontend host portu yanıt vermiyor; nginx sync yine de denenecek."
  fi
  sleep 2
done

echo "==> Container durumu:"
"${COMPOSE[@]}" ps

API_PORT="$(grep '^API_HOST_PORT=' "${ENV_FILE}" | cut -d= -f2)"
API_PORT="${API_PORT:-3202}"

echo "==> API health check..."
wait_for_health "${API_PORT}" "/health" 40

if docker network inspect "${KILIC_TTEN_NETWORK:-ttengamesstudio_ttengamesstudio-network}" >/dev/null 2>&1; then
  bash "${ROOT_DIR}/deploy/sync-tten-nginx.sh" || {
    echo "Nginx sync başarısız — manuel: bash deploy/sync-tten-nginx.sh"
    exit 1
  }
else
  echo "UYARI: TTEN ağı yok — nginx sync atlandı."
fi

echo "Deploy tamamlandı: $(date -Is)"
