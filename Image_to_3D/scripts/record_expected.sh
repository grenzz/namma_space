#!/usr/bin/env bash
# After a successful test run, record what a correct run looks like into test/expected/summary.txt.
# usage: scripts/record_expected.sh <scene_dir> [steps]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
S="${1:?usage: record_expected.sh <scene_dir> [steps]}"; STEPS="${2:-unknown}"
[ -f "$S/model.ply" ] || { echo "ERROR: $S/model.ply not found; run the engine first"; exit 1; }
[ -f "$ROOT/.venv/bin/activate" ] && source "$ROOT/.venv/bin/activate"
mkdir -p "$ROOT/test/expected"
{
  echo "# Recorded $(date -u +%F) by scripts/record_expected.sh. Training is not deterministic: expect similar numbers, not identical files."
  echo "frames in input: $(ls "$S/input" | wc -l)"
  echo "OpenSplat steps: $STEPS"
  echo "--- timeline.py"
  python "$ROOT/timeline.py" "$S" | grep -v '^[#.]*$'
  echo "--- model.ply"
  echo "size: $(du -h "$S/model.ply" | cut -f1)"
  echo "--- machine"
  nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>/dev/null || true
  colmap -h 2>&1 | sed -n 1,2p
  python -c "import torch;print('torch',torch.__version__,'cuda',torch.version.cuda)"
} > "$ROOT/test/expected/summary.txt"
cat "$ROOT/test/expected/summary.txt"
