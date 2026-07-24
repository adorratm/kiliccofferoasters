#!/usr/bin/env bash
# TTEN nginx'e kiliccoffee.conf merge + reload + doğrulama
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/nginx-merge-kilic.sh
source "${ROOT_DIR}/deploy/lib/nginx-merge-kilic.sh"
# shellcheck source=lib/load-env.sh
source "${ROOT_DIR}/deploy/lib/load-env.sh"
ENV_FILE="${ROOT_DIR}/deploy/.env"
NGINX_CONTAINER="${NGINX_CONTAINER:-ttengamesstudio-nginx}"
TTEN_TPL="${TTEN_TEMPLATES:-/opt/ttengamesstudio/docker/nginx/templates}"
TTEN_NET="${KILIC_TTEN_NETWORK:-ttengamesstudio_ttengamesstudio-network}"
SSL_MODE="${1:-}"

if [[ -f "${ENV_FILE}" ]]; then
  load_env_file "${ENV_FILE}"
  TTEN_NET="${KILIC_TTEN_NETWORK:-${TTEN_NET}}"
fi

KILIC_CONTAINERS=(kiliccoffee-prod-frontend kiliccoffee-prod-admin kiliccoffee-prod-api)

if [[ -z "${SSL_MODE}" ]]; then
  if certs_ready_for_https "${NGINX_CONTAINER}"; then
    SSL_MODE=https
  else
    SSL_MODE=http
  fi
fi

if [[ "${SSL_MODE}" == "https" ]] && ! certs_ready_for_https "${NGINX_CONTAINER}"; then
  echo "UYARI: HTTPS istendi ama sertifika yok/eksik — HTTP moda düşülüyor."
  echo "  Host: ls /etc/letsencrypt/live/kiliccoffeeroaster.com.tr/"
  SSL_MODE=http
fi

verify_tten_frontend_dns() {
  if ! docker ps --format '{{.Names}}' | grep -qx ttengamesstudio-frontend; then
    return 0
  fi

  local frontend_ip kilic_ip tten_ip
  frontend_ip="$(docker exec "${NGINX_CONTAINER}" getent hosts frontend 2>/dev/null | awk '{print $1; exit}')"
  kilic_ip="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' kiliccoffee-prod-frontend 2>/dev/null | awk '{print $1}')"
  tten_ip="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' ttengamesstudio-frontend 2>/dev/null | awk '{print $1}')"

  if [[ -n "${frontend_ip}" && -n "${kilic_ip}" && "${frontend_ip}" == "${kilic_ip}" ]]; then
    echo "  HATA: 'frontend' DNS kiliccoffee'ye çözülüyor — TTEN bozulur."
    echo "  Çözüm: compose force-recreate api frontend admin, sonra bu script."
    return 1
  fi

  if [[ -n "${frontend_ip}" && -n "${tten_ip}" && "${frontend_ip}" == "${tten_ip}" ]]; then
    echo "  OK  frontend → ttengamesstudio-frontend (${frontend_ip})"
  elif [[ -n "${frontend_ip}" ]]; then
    echo "  UYARI: frontend → ${frontend_ip} (TTEN IP: ${tten_ip:-?})"
  fi
  return 0
}

ensure_kilic_on_tten_network() {
  local container on_net

  if ! docker network inspect "${TTEN_NET}" >/dev/null 2>&1; then
    echo "TTEN ağı yok (${TTEN_NET}) — atlanıyor."
    return 1
  fi

  echo "==> Kılıç Coffee → ${TTEN_NET} ağı..."
  for container in "${KILIC_CONTAINERS[@]}"; do
    if ! docker ps --format '{{.Names}}' | grep -qx "${container}"; then
      echo "  UYARI: ${container} çalışmıyor"
      continue
    fi
    on_net="$(docker network inspect "${TTEN_NET}" --format '{{range .Containers}}{{.Name}} {{end}}' | grep -ow "${container}" || true)"
    if [[ -n "${on_net}" ]]; then
      echo "  OK  ${container}"
    else
      echo "  + ${container} bağlanıyor..."
      docker network connect "${TTEN_NET}" "${container}"
    fi
  done
  return 0
}

wait_for_nginx_upstream() {
  local attempt

  for attempt in $(seq 1 15); do
    if docker exec "${NGINX_CONTAINER}" wget -q --spider --timeout=3 http://kiliccoffee-prod-frontend:3000/ 2>/dev/null; then
      echo "  OK  kiliccoffee-prod-frontend:3000 (${attempt}. deneme)"
      return 0
    fi
    echo "  Bekleniyor... frontend upstream (${attempt}/15)"
    ensure_kilic_on_tten_network || true
    sleep 2
  done
  return 1
}

if ! docker ps -a --format '{{.Names}}' | grep -qx "${NGINX_CONTAINER}"; then
  echo "TTEN nginx yok (${NGINX_CONTAINER}) — atlanıyor."
  exit 0
fi

echo "==> kiliccoffee.conf güncelleniyor (mod: ${SSL_MODE})..."
bash "${ROOT_DIR}/deploy/render-kiliccoffee-conf.sh" "${SSL_MODE}"
export KILIC_CONF_HOST="${TTEN_TPL}/kiliccoffee.conf"

if ! docker ps --format '{{.Names}}' | grep -qx "${NGINX_CONTAINER}"; then
  echo "TTEN nginx çalışmıyor — conf render edildi, sync atlandı."
  exit 0
fi

echo "==> Nginx container hazır bekleniyor..."
if ! wait_for_nginx_running "${NGINX_CONTAINER}" 60; then
  if [[ -f "${KILIC_CONF_HOST}" ]]; then
    recover_nginx_from_restart_loop "${NGINX_CONTAINER}" "${KILIC_CONF_HOST}"
  else
    echo "HATA: nginx hazır değil ve ${KILIC_CONF_HOST} yok."
    exit 1
  fi
fi

ensure_kilic_on_tten_network || exit 0
verify_tten_frontend_dns || exit 1

echo "==> Nginx kiliccoffee conf.d..."
if ! apply_kilic_nginx_config "${NGINX_CONTAINER}"; then
  echo "UYARI: Coffee conf uygulanamadı / geri alındı — TTEN+portfolio korunmalı."
  echo "  Kurtarma: bash deploy/recover-nginx.sh"
  echo "  Sertifika sonrası: bash deploy/sync-tten-nginx.sh https"
  exit 0
fi

echo "==> Nginx → kiliccoffee upstream testi..."
if ! wait_for_nginx_upstream; then
  echo "  UYARI: coffee frontend upstream yok (container kapalı olabilir) — conf yerinde."
fi

echo "==> Host header smoke testi..."
code="$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: kiliccoffeeroaster.com.tr' http://127.0.0.1/ || echo 000)"
echo "  HTTP Host kiliccoffeeroaster.com.tr → ${code}"

if [[ "${SSL_MODE}" == "https" ]]; then
  for attempt in $(seq 1 10); do
    if curl -fsSI --resolve kiliccoffeeroaster.com.tr:443:127.0.0.1 https://kiliccoffeeroaster.com.tr/ -k 2>/dev/null | head -1 | grep -qE 'HTTP/2 200|HTTP/1.1 200|301|302'; then
      echo "  OK  https://kiliccoffeeroaster.com.tr/"
      break
    fi
    if [[ "${attempt}" -eq 10 ]]; then
      echo "  UYARI: HTTPS smoke başarısız (cert/Cloudflare proxy?). Upstream OK olabilir."
    fi
    sleep 2
  done
fi

echo "==> TTEN /_nuxt koruma testi..."
nuxt_path="$(curl -fsS -H 'Host: ttengamesstudio.com.tr' http://127.0.0.1/ 2>/dev/null \
  | grep -oE '/_nuxt/[^"'\'' ]+\.css' | head -1 || true)"
if [[ -n "${nuxt_path}" ]]; then
  code="$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: ttengamesstudio.com.tr' "http://127.0.0.1${nuxt_path}" || echo 000)"
  if [[ "${code}" == "200" ]]; then
    echo "  OK  ttengamesstudio.com.tr${nuxt_path}"
  else
    echo "  HATA: TTEN statik → HTTP ${code} (frontend DNS çakışması?)"
    docker exec "${NGINX_CONTAINER}" getent hosts frontend 2>/dev/null || true
    exit 1
  fi
else
  echo "  UYARI: _nuxt CSS yolu bulunamadı"
fi

echo "Nginx sync tamam."
exit 0
