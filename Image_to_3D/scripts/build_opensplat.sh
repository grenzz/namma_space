#!/usr/bin/env bash
# Build OpenSplat against the PyTorch inside .venv (the binary links to that libtorch, so rebuild if the venv changes).
# usage: scripts/build_opensplat.sh
# optional environment variables:
#   CUDA_HOME           CUDA toolkit to build with (default: /usr/local/cuda-<the CUDA version torch was built for>)
#   CUDA_ARCH           e.g. 120 for an RTX 50-series GPU (compute capability 12.0); default: let CMake decide
#   CUDA_HOST_COMPILER  e.g. /usr/bin/g++-14 if nvcc rejects your default gcc
#   EXTRA_CMAKE         any extra -D flags;  JOBS  parallel jobs (default 2, nvcc is memory hungry)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="${PYTHON:-$ROOT/.venv/bin/python}"
SRC="$ROOT/third_party/opensplat"; BLD="$SRC/build"
[ -f "$SRC/CMakeLists.txt" ] || { echo "ERROR: OpenSplat source not found at $SRC"; exit 1; }
[ -x "$PY" ] || { echo "ERROR: $PY not found (run scripts/setup_env.sh first)"; exit 1; }

TORCH_CMAKE="$("$PY" -c 'import torch; print(torch.utils.cmake_prefix_path)')"
TORCH_CUDA="$("$PY" -c 'import torch; print(torch.version.cuda or "")')"
[ -n "$TORCH_CUDA" ] || { echo "ERROR: this PyTorch has no CUDA support"; exit 1; }
CUDA_HOME="${CUDA_HOME:-/usr/local/cuda-$TORCH_CUDA}"
[ -d "$CUDA_HOME" ] || { echo "ERROR: CUDA toolkit $TORCH_CUDA not found at $CUDA_HOME (set CUDA_HOME)"; exit 1; }
export CUDA_HOME PATH="$CUDA_HOME/bin:$PATH"
NVCC_REL="$(nvcc --version | sed -n 's/.*release \([0-9.]*\),.*/\1/p')"
echo "torch CUDA $TORCH_CUDA | nvcc $NVCC_REL | cmake prefix $TORCH_CMAKE"
[ "$NVCC_REL" = "$TORCH_CUDA" ] || echo "WARNING: nvcc $NVCC_REL differs from torch's CUDA $TORCH_CUDA; the build may fail or misbehave"

ARGS=(-DCMAKE_PREFIX_PATH="$TORCH_CMAKE" -DCMAKE_BUILD_TYPE=Release)
[ -n "${CUDA_ARCH:-}" ] && ARGS+=(-DCMAKE_CUDA_ARCHITECTURES="$CUDA_ARCH")
[ -n "${CUDA_HOST_COMPILER:-}" ] && ARGS+=(-DCMAKE_CUDA_HOST_COMPILER="$CUDA_HOST_COMPILER")
rm -rf "$BLD"
# shellcheck disable=SC2086
cmake -S "$SRC" -B "$BLD" "${ARGS[@]}" ${EXTRA_CMAKE:-}
cmake --build "$BLD" -j"${JOBS:-2}"
"$BLD/opensplat" --version
