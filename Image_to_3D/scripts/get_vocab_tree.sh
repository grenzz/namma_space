#!/usr/bin/env bash
# Download the COLMAP vocabulary tree used for loop detection on long videos (> 450 frames).
# COLMAP >= 3.12 reads only the faiss format; the old vocab_tree_flickr100K_words*.bin files crash it.
# The 256K-word tree is the one for more than ~1000 images.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="vocab_tree_faiss_flickr100K_words256K.bin"
URL="${VOCAB_URL:-https://github.com/colmap/colmap/releases/download/3.11.1/$NAME}"
mkdir -p "$ROOT/environment"
if [ -s "$ROOT/environment/$NAME" ]; then echo "already present: environment/$NAME"; exit 0; fi
curl -fL -o "$ROOT/environment/$NAME" "$URL" || { rm -f "$ROOT/environment/$NAME"; echo "ERROR: download failed. Get $NAME from COLMAP's release assets and put it in environment/"; exit 1; }
ls -lh "$ROOT/environment/$NAME"
