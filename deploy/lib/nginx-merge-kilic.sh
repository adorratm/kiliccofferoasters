#!/usr/bin/env bash
# Kılıç Coffee nginx: ayrı conf.d dosyası (default.conf'a merge YOK)
# nginx -t başarısız olursa conf GERİ ALINIR — diğer siteleri düşürmez
set -euo pipefail

KILIC_CONF_D_BASENAME="${KILIC_CONF_D_BASENAME:-kiliccoffee.conf}"

wait_for_nginx_running() {
  local container="${1:?nginx container adı gerekli}"
  local max_attempts="${2:-90}"
  local attempt status

  for attempt in $(seq 1 "${max_attempts}"); do
    status="$(docker inspect -f '{{.State.Status}}' "${container}" 2>/dev/null || echo missing)"

    case "${status}" in
      running)
        if docker exec "${container}" true 2>/dev/null; then
          [[ "${attempt}" -gt 1 ]] && echo "  OK  ${container} hazır (${attempt}. deneme)"
          return 0
        fi
        ;;
      restarting)
        echo "  Bekleniyor... ${container} restarting (${attempt}/${max_attempts})"
        ;;
      exited|created)
        echo "  ${container} durmuş — başlatılıyor..."
        docker start "${container}" >/dev/null 2>&1 || true
        ;;
      missing)
        echo "  HATA: ${container} bulunamadı" >&2
        return 1
        ;;
      *)
        echo "  Bekleniyor... ${container} (${status}) (${attempt}/${max_attempts})"
        ;;
    esac
    sleep 2
  done

  echo "  HATA: ${container} ${max_attempts} denemede hazır olmadı (durum: ${status})" >&2
  return 1
}

remove_kilic_conf() {
  local container="${1:?}"
  local tpl_host="${2:-}"

  echo "  → kiliccoffee conf kaldırılıyor (rollback)..."
  docker exec "${container}" rm -f \
    "/etc/nginx/conf.d/${KILIC_CONF_D_BASENAME}" \
    /etc/nginx/templates/kiliccoffee.conf 2>/dev/null || true
  if [[ -n "${tpl_host}" && -f "${tpl_host}" ]]; then
    rm -f "${tpl_host}"
  fi
  rm -f /opt/ttengamesstudio/docker/nginx/templates/kiliccoffee.conf 2>/dev/null || true
}

docker_exec_retry() {
  local container="$1"
  shift
  local attempt

  for attempt in $(seq 1 15); do
    if docker exec "${container}" "$@" 2>/dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

install_kilic_conf_d() {
  local container="${1:?nginx container adı gerekli}"
  local tpl_host="${2:-}"

  if [[ -z "${tpl_host}" || ! -f "${tpl_host}" ]]; then
    echo "kiliccoffee template host dosyası yok" >&2
    return 1
  fi

  # Önce container'a kopyala
  docker cp "${tpl_host}" "${container}:/etc/nginx/templates/kiliccoffee.conf"
  docker cp "${tpl_host}" "${container}:/etc/nginx/conf.d/${KILIC_CONF_D_BASENAME}"
  echo "  + conf.d/${KILIC_CONF_D_BASENAME}"
  return 0
}

reload_nginx_if_valid() {
  local container="${1:?nginx container adı gerekli}"

  wait_for_nginx_running "${container}" 30 || return 1

  if docker exec "${container}" nginx -t 2>&1; then
    docker exec "${container}" nginx -s reload
    return 0
  fi
  return 1
}

# Sertifika hem host'ta hem container mount'unda olmalı
certs_ready_for_https() {
  local host_cert="/etc/letsencrypt/live/kiliccoffeeroaster.com.tr/fullchain.pem"
  local host_key="/etc/letsencrypt/live/kiliccoffeeroaster.com.tr/privkey.pem"
  local container="${1:-ttengamesstudio-nginx}"

  [[ -f "${host_cert}" && -f "${host_key}" ]] || return 1

  if docker ps --format '{{.Names}}' | grep -qx "${container}"; then
    docker exec "${container}" test -f /etc/letsencrypt/live/kiliccoffeeroaster.com.tr/fullchain.pem \
      && docker exec "${container}" test -f /etc/letsencrypt/live/kiliccoffeeroaster.com.tr/privkey.pem
  else
    return 1
  fi
}

apply_kilic_nginx_config() {
  local container="${1:?nginx container adı gerekli}"
  local tpl_host="${KILIC_CONF_HOST:-}"

  echo "==> Nginx container bekleniyor..."
  wait_for_nginx_running "${container}" 60 || return 1

  install_kilic_conf_d "${container}" "${tpl_host}" || return 1

  if reload_nginx_if_valid "${container}"; then
    return 0
  fi

  echo "UYARI: nginx -t başarısız — kiliccoffee conf geri alınıyor (diğer siteler korunsun)..."
  docker exec "${container}" nginx -t 2>&1 || true
  remove_kilic_conf "${container}" "${tpl_host}"

  if reload_nginx_if_valid "${container}"; then
    echo "  OK  rollback sonrası nginx sağlıklı (coffee conf yok)."
    return 1
  fi

  # Hâlâ bozuksa restart + conf yok
  docker restart "${container}" >/dev/null
  wait_for_nginx_running "${container}" 90
  remove_kilic_conf "${container}" "${tpl_host}"
  reload_nginx_if_valid "${container}"
  return 1
}
