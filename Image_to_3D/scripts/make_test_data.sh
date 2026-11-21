#!/usr/bin/env bash
# Fill test/frames with N consecutive frames from an extracted-frames folder (consecutive, so COLMAP can still match them).
# usage: scripts/make_test_data.sh <frames_dir> [N=40]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${1:?usage: make_test_data.sh <frames_dir> [N=40]}"; N="${2:-40}"
mkdir -p "$ROOT/test/frames"
ls "$SRC" | grep -iE '\.(jpg|jpeg|png)$' | sort | head -n "$N" | while read -r f; do cp "$SRC/$f" "$ROOT/test/frames/"; done
echo "test/frames: $(ls "$ROOT/test/frames" | wc -l) files, $(du -sh "$ROOT/test/frames" | cut -f1)"
