#!/usr/bin/env bash
# Bootstrap Engram + Cursor MCP para un repositorio git.
# Uso: desde la raíz del repo → bash scripts/setup-engram-cursor.sh
#      o → setup-engram-cursor.sh (si está en PATH)
#
# En PC nuevo (tras sync-all / git clone):
#   1. Instalar engram (https://github.com/Gentleman-Programming/engram)
#   2. bash scripts/setup-engram-cursor.sh   # fija ruta absoluta en .cursor/mcp.json
#   3. bash scripts/prune-engram-global-mcp.sh  # quita engram duplicado del MCP global
#   4. Recargar Cursor
#   4. Opcional: engram import backup.json para traer memorias de otro equipo

set -euo pipefail

find_engram_bin() {
  if [[ -n "${ENGRAM_BIN:-}" && -x "${ENGRAM_BIN}" ]]; then
    echo "${ENGRAM_BIN}"
    return
  fi
  local candidate
  candidate="$(command -v engram 2>/dev/null || true)"
  if [[ -n "${candidate}" && -x "${candidate}" ]]; then
    echo "${candidate}"
    return
  fi
  for candidate in \
    "${HOME}/go/bin/engram" \
    /home/linuxbrew/.linuxbrew/bin/engram \
    /usr/local/bin/engram \
    "${HOME}/.local/bin/engram"; do
    if [[ -x "${candidate}" ]]; then
      echo "${candidate}"
      return
    fi
  done
  echo "No se encontró engram. Instálalo: https://github.com/Gentleman-Programming/engram" >&2
  exit 1
}

resolve_project_name() {
  local root="$1"
  local force="${2:-}"
  local remote_name folder existing

  if [[ "${force}" != "--force" && -f "${root}/.engram/config.json" ]]; then
    if command -v jq >/dev/null 2>&1; then
      existing="$(jq -r '.project_name // empty' "${root}/.engram/config.json" 2>/dev/null || true)"
      if [[ -n "${existing}" ]]; then
        echo "${existing}"
        return
      fi
    fi
  fi

  remote_name=""
  if git -C "${root}" remote get-url origin >/dev/null 2>&1; then
    remote_name="$(basename "$(git -C "${root}" remote get-url origin)" .git)"
  fi
  folder="$(basename "${root}")"

  case "${remote_name}:${folder}" in
    LIGHT-ON:*|*:lighton) echo "LIGHT-ON" ;;
    PurpleBasque:*|*:purple-basque) echo "purplebasque" ;;
    PortfolioDev:*|*:PortfolioDev) echo "portfoliodev" ;;
    DISCOGRAFICA:*|*:discografica) echo "discografica" ;;
    ecommerce-starter-kit:*) echo "ecommerce-starter-kit" ;;
    electricista-landing:*|*:electricista-landing) echo "electrician_capstone" ;;
    *)
      if [[ -n "${remote_name}" ]]; then
        echo "${remote_name}"
      else
        echo "${folder}"
      fi
      ;;
  esac
}

write_engram_config() {
  local root="$1"
  local project="$2"
  mkdir -p "${root}/.engram"
  cat >"${root}/.engram/config.json" <<EOF
{
  "project_name": "${project}"
}
EOF
}

write_cursor_mcp() {
  local root="$1"
  local project="$2"
  local engram_bin="$3"
  local default_path="${HOME}/.local/share/pnpm:${HOME}/.local/bin:${HOME}/go/bin:/home/linuxbrew/.linuxbrew/bin:${HOME}/.nvm/versions/node/current/bin:/usr/bin:/usr/local/bin:/bin"
  mkdir -p "${root}/.cursor"
  cat >"${root}/.cursor/mcp.json" <<EOF
{
  "mcpServers": {
    "engram": {
      "command": "${engram_bin}",
      "args": ["mcp", "--tools=agent", "--project=${project}"],
      "env": {
        "ENGRAM_PROJECT": "${project}",
        "PATH": "${default_path}"
      }
    }
  }
}
EOF
}

write_engram_rule() {
  local root="$1"
  local project="$2"
  local target="${root}/.cursor/rules/engram.mdc"
  if [[ -f "${target}" ]]; then
    return 0
  fi
  mkdir -p "${root}/.cursor/rules"
  cat >"${target}" <<EOF
---
description: Memoria persistente Engram — proyecto ${project}
alwaysApply: true
---

# Engram — \`${project}\`

Bootstrap: \`scripts/setup-engram-cursor.sh\` + \`scripts/prune-engram-global-mcp.sh\` (Cursor).
En LightON, la guía canónica está en \`.cursor/rules/engram.mdc\` del repo.
EOF
}

main() {
  local root engram_bin project force=""
  if [[ "${1:-}" == "--force" ]]; then
    force="--force"
    shift
  fi

  root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "Ejecuta este script dentro de un repositorio git." >&2
    exit 1
  }

  engram_bin="$(find_engram_bin)"
  project="$(resolve_project_name "${root}" "${force}")"

  write_engram_config "${root}" "${project}"
  write_cursor_mcp "${root}" "${project}" "${engram_bin}"
  write_engram_rule "${root}" "${project}"

  echo "✓ Engram configurado para: ${root}"
  echo "  Proyecto: ${project}"
  echo "  Binario:  ${engram_bin}"
  echo "  Archivos: .engram/config.json, .cursor/mcp.json"
  echo ""
  echo "Recomendado en Cursor (evita ambiguous_project):"
  echo "  bash scripts/prune-engram-global-mcp.sh"
  echo ""
  echo "Recarga Cursor (Developer: Reload Window) al cambiar de repo."
}

main "$@"
