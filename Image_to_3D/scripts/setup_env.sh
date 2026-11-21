#!/usr/bin/env bash
# Create .venv from the exact versions the engine was built and tested with.
# usage: [PYTHON=/path/to/python3.10] scripts/setup_env.sh [engine|full]
#   engine (default): install only torch, numpy and opencv; every dependency is pinned to the lock file
#   full: install the whole lock file
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/environment/requirements.lock.txt"
MODE="${1:-engine}"
PY="${PYTHON:-python3.10}"
[ -f "$LOCK" ] || { echo "ERROR: $LOCK not found"; exit 1; }
"$PY" -c 'import sys; sys.exit(0 if sys.version_info[:2]==(3,10) else 1)' \
  || { echo "ERROR: Python 3.10 required (set PYTHON=/path/to/python3.10)"; exit 1; }
"$PY" -m venv "$ROOT/.venv"
source "$ROOT/.venv/bin/activate"
python -m pip install "pip==${PIP_VERSION:-26.2.2}"
CONS="$(mktemp)"
grep -vE ' @ |^-e |^#' "$LOCK" > "$CONS"      # constraint files cannot contain URL or editable installs
EXTRA=""
CU="$(grep -iE '^torch==' "$CONS" | sed -n 's/.*+\(cu[0-9]*\).*/\1/p' || true)"
[ -n "$CU" ] && EXTRA="--extra-index-url https://download.pytorch.org/whl/$CU"
if [ "$MODE" = full ]; then
  # shellcheck disable=SC2086
  pip install $EXTRA -r "$CONS"
else
  PINS="$(grep -iE '^(torch|numpy|opencv[a-z-]*)==' "$CONS" | tr '\n' ' ')"
  echo "installing: $PINS"
  # shellcheck disable=SC2086
  pip install $EXTRA $PINS -c "$CONS"
fi
python -c "import torch,numpy,cv2;print('torch',torch.__version__,'cuda',torch.version.cuda,'| numpy',numpy.__version__,'| cv2',cv2.__version__)"
