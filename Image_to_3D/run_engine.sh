#!/usr/bin/env bash
# End-to-end engine: video (or folder of frames) -> COLMAP -> OpenSplat -> model.ply
#
# usage: ./run_engine.sh <video-or-frames-dir> <scene_dir> [frames=300] [steps=30000]
#   frames  target frame count when the input is a video (ignored for a frames folder)
#   steps   OpenSplat training steps (use >= 30000 for a final model; 3000 stays blurry)
#
# optional environment variables:
#   OPENSPLAT       path to the opensplat binary   (default: third_party/opensplat/build/opensplat)
#   OPENSPLAT_ARGS  extra OpenSplat flags, e.g. "-d 2" to halve training resolution if memory runs out
#   VOCAB           faiss vocabulary tree for loop detection (default: environment/vocab_tree_faiss_flickr100K_words256K.bin)
#   OVERLAP         sequential-matching window (default 20)
#   MIN_REG         minimum fraction of frames COLMAP must register (default 0.85; 0 disables the check)
#   FORCE=1         delete an existing scene_dir first
#   ALLOW_CPU_COLMAP=1  allow a COLMAP build without CUDA (very slow)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ $# -lt 2 ]; then sed -n '2,17p' "$0"; exit 1; fi
SRC="$1"; SCENE="$2"; TARGET="${3:-300}"; STEPS="${4:-30000}"
[ -f "$ROOT/.venv/bin/activate" ] && source "$ROOT/.venv/bin/activate"
OPENSPLAT="${OPENSPLAT:-$ROOT/third_party/opensplat/build/opensplat}"
VOCAB="${VOCAB:-$ROOT/environment/vocab_tree_faiss_flickr100K_words256K.bin}"
OVERLAP="${OVERLAP:-20}"
MIN_REG="${MIN_REG:-0.85}"
DB="$SCENE/distorted/database.db"

command -v colmap >/dev/null || { echo "ERROR: colmap not found in PATH"; exit 1; }
[ -x "$OPENSPLAT" ] || { echo "ERROR: OpenSplat binary not found at $OPENSPLAT (run scripts/build_opensplat.sh)"; exit 1; }
[ -e "$SRC" ] || { echo "ERROR: input not found: $SRC"; exit 1; }

CH="$(colmap -h 2>&1 || true)"
sed -n 1,2p <<<"$CH"
if ! grep -q 'with CUDA' <<<"$CH" && [ "${ALLOW_CPU_COLMAP:-0}" != 1 ]; then
  echo "ERROR: colmap at $(command -v colmap) was built without CUDA. Put a CUDA build first in PATH (or set ALLOW_CPU_COLMAP=1)."
  exit 1
fi
# COLMAP >= 3.12 renamed its GPU options
HELP="$(colmap feature_extractor -h 2>&1 || true)"
if grep -q 'FeatureExtraction.use_gpu' <<<"$HELP"; then
  FE_GPU="--FeatureExtraction.use_gpu 1"; MT_GPU="--FeatureMatching.use_gpu 1"
else
  FE_GPU="--SiftExtraction.use_gpu 1";    MT_GPU="--SiftMatching.use_gpu 1"
fi

if [ -e "$DB" ]; then
  if [ "${FORCE:-0}" = 1 ]; then rm -rf "$SCENE"
  else echo "ERROR: $SCENE already holds a COLMAP database. Use a new scene dir or FORCE=1."; exit 1; fi
fi
mkdir -p "$SCENE/input" "$SCENE/distorted/sparse"

echo "== 1/5 frames"
if [ -d "$SRC" ]; then
  find "$SRC" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -exec cp {} "$SCENE/input/" \;
else
  python "$ROOT/frame.py" "$SRC" "$SCENE/input" "$TARGET" 1600
fi
N="$(find "$SCENE/input" -maxdepth 1 -type f | wc -l)"
[ "$N" -gt 0 ] || { echo "ERROR: no frames in $SCENE/input"; exit 1; }
echo "   $N frames"

echo "== 2/5 COLMAP: features, matching, mapping"
colmap feature_extractor --database_path "$DB" --image_path "$SCENE/input" \
  --ImageReader.single_camera 1 --ImageReader.camera_model SIMPLE_RADIAL $FE_GPU
if [ "$N" -le 450 ]; then
  colmap exhaustive_matcher --database_path "$DB" $MT_GPU
elif [ -f "$VOCAB" ]; then
  colmap sequential_matcher --database_path "$DB" $MT_GPU \
    --SequentialMatching.overlap "$OVERLAP" --SequentialMatching.loop_detection 1 \
    --SequentialMatching.vocab_tree_path "$VOCAB"
else
  echo "WARNING: no vocabulary tree at $VOCAB (run scripts/get_vocab_tree.sh)."
  echo "         Matching without loop closure; a long loop may drift."
  colmap sequential_matcher --database_path "$DB" $MT_GPU --SequentialMatching.overlap "$OVERLAP"
fi
MAPPER_ARGS="--Mapper.ba_global_function_tolerance=0.000001"
[ "$N" -gt 450 ] && MAPPER_ARGS="$MAPPER_ARGS --Mapper.ba_global_max_num_iterations 20 --Mapper.ba_global_max_refinements 3"
colmap mapper --database_path "$DB" --image_path "$SCENE/input" \
  --output_path "$SCENE/distorted/sparse" $MAPPER_ARGS

echo "== 3/5 undistort and lay out for OpenSplat"
python "$ROOT/convert.py" -s "$SCENE" --skip_matching

echo "== 4/5 registration check (want nearly all frames, one model folder)"
python "$ROOT/timeline.py" "$SCENE" "$MIN_REG" || {
  echo "Registration is below $MIN_REG. Re-record the gaps, or continue anyway with MIN_REG=0."
  exit 1
}

echo "== 5/5 OpenSplat ($STEPS steps)"
# shellcheck disable=SC2086
"$OPENSPLAT" "$SCENE" -o "$SCENE/model.ply" -n "$STEPS" --keep-crs ${OPENSPLAT_ARGS:-}
echo "done: $SCENE/model.ply"
