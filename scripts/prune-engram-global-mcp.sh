#!/usr/bin/env bash
# Quita el servidor Engram de ~/.cursor/mcp.json (config global de Cursor).
#
# Por qué: si Engram está definido a nivel global SIN --project y también en el repo
# CON --project, Cursor puede arrancar el MCP con cwd=$HOME y devolver ambiguous_project.
#
# Uso:
#   bash scripts/prune-engram-global-mcp.sh          # quita engram del global
#   bash scripts/prune-engram-global-mcp.sh --dry-run # solo muestra qué haría
#
# Después: Developer → Reload Window en Cursor.

set -euo pipefail

GLOBAL_MCP="${HOME}/.cursor/mcp.json"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

if [[ ! -f "${GLOBAL_MCP}" ]]; then
  echo "No existe ${GLOBAL_MCP}; nada que hacer."
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Se necesita jq. Instálalo: sudo apt install jq" >&2
  exit 1
fi

if ! jq -e '.mcpServers.engram' "${GLOBAL_MCP}" >/dev/null 2>&1; then
  echo "✓ ${GLOBAL_MCP} no define engram; ya está limpio."
  exit 0
fi

echo "Engram en MCP global (sin --project del repo):"
jq '.mcpServers.engram' "${GLOBAL_MCP}"

if [[ "${DRY_RUN}" == true ]]; then
  echo ""
  echo "[dry-run] Se eliminaría .mcpServers.engram de ${GLOBAL_MCP}"
  exit 0
fi

backup="${GLOBAL_MCP}.bak.$(date +%Y%m%d-%H%M%S)"
cp "${GLOBAL_MCP}" "${backup}"
jq 'del(.mcpServers.engram)' "${GLOBAL_MCP}" >"${GLOBAL_MCP}.tmp"
mv "${GLOBAL_MCP}.tmp" "${GLOBAL_MCP}"

echo ""
echo "✓ Eliminado engram del MCP global."
echo "  Backup: ${backup}"
echo "  Cada repo usa su .cursor/mcp.json (con --project=...)."
echo ""
echo "Recarga Cursor: Developer → Reload Window"
