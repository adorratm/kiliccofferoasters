#!/usr/bin/env bash
# Acil: bozuk kiliccoffee.conf nginx'i düşürdüyse TTEN + portfolio'yu kurtar
# Sunucu (root): bash deploy/recover-nginx.sh
set -euo pipefail

NGINX_CONTAINER="${NGINX_CONTAINER:-ttengamesstudio-nginx}"
TTEN_TPL="${TTEN_TEMPLATES:-/opt/ttengamesstudio/docker/nginx/templates}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Root gerekli: sudo bash $0"
  exit 1
fi

echo "==> Host nginx kapatılıyor (Ubuntu 1.24 80/443 kaplamasın)..."
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true

echo "==> Bozuk kiliccoffee conf kaldırılıyor..."
rm -f "${TTEN_TPL}/kiliccoffee.conf"
if docker ps -a --format '{{.Names}}' | grep -qx "${NGINX_CONTAINER}"; then
  docker exec "${NGINX_CONTAINER}" rm -f /etc/nginx/conf.d/kiliccoffee.conf 2>/dev/null || true
  docker exec "${NGINX_CONTAINER}" rm -f /etc/nginx/templates/kiliccoffee.conf 2>/dev/null || true
fi

echo "==> ${NGINX_CONTAINER} başlatılıyor..."
docker start "${NGINX_CONTAINER}" 2>/dev/null || true
sleep 2

if ! docker ps --format '{{.Names}}' | grep -qx "${NGINX_CONTAINER}"; then
  echo "Container yok/başlamadı — TTEN compose:"
  if [[ -d /opt/ttengamesstudio ]]; then
    (cd /opt/ttengamesstudio && docker compose up -d) || true
  fi
fi

echo "==> nginx -t..."
for i in $(seq 1 20); do
  if docker exec "${NGINX_CONTAINER}" nginx -t 2>&1; then
    docker exec "${NGINX_CONTAINER}" nginx -s reload 2>/dev/null || docker restart "${NGINX_CONTAINER}" >/dev/null
    break
  fi
  if [[ "${i}" -eq 20 ]]; then
    echo "HATA: nginx -t hâlâ başarısız. Log:"
    docker logs "${NGINX_CONTAINER}" --tail 50 2>&1 || true
    docker exec "${NGINX_CONTAINER}" nginx -t 2>&1 || true
    exit 1
  fi
  echo "  Bekleniyor... (${i}/20)"
  sleep 2
done

echo "==> Smoke..."
curl -sI -H 'Host: ttengamesstudio.com.tr' http://127.0.0.1/ | head -5 || true
curl -sI -H 'Host: emrekilic.web.tr' http://127.0.0.1/tr | head -5 || true

if [[ -d /opt/portfolio ]]; then
  echo "==> Portfolio nginx sync..."
  (cd /opt/portfolio && bash deploy/sync-tten-nginx.sh) || echo "UYARI: portfolio sync başarısız"
fi

echo ""
echo "Kurtarma tamam. Coffee HTTPS conf'u sertifika YOKKEN eklemeyin."
echo "  ls /etc/letsencrypt/live/kiliccoffeeroaster.com.tr/"
echo "Sertifika yoksa: cd /opt/kiliccofferoaster && bash deploy/sync-tten-nginx.sh http"
