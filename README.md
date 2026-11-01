# Namma Space

Turn **one smartphone walkthrough video** of an indoor space into a photorealistic 3D model that anyone can walk through in a web browser: no manual 3D modelling, nothing to install for the viewer.

- **Live viewer:** **TODO: paste the GitHub Pages link here**
- **Reconstruction engine:** [`Image_to_3D/`](Image_to_3D/): video → frames → COLMAP → OpenSplat (3D Gaussian Splatting) → `model.ply`
- **Web viewer:** **TODO: viewer folder name**: Three.js + Spark, WASD + mouse look, collision against walkable/obstacle polygons

## How it works

```
video ─ frame.py ─▶ sharp frames ─ COLMAP (GPU) ─▶ camera poses ─ convert.py ─▶ undistorted scene
      ─ OpenSplat (30 000 steps) ─▶ model.ply ─▶ compressed splat ─▶ web viewer
```

| Stage | Tool | What it does |
|---|---|---|
| 0 | `frame.py` | Cuts the video into equal windows and keeps the sharpest frame of each (variance of the Laplacian), at most 1600 px on the long side |
| 1 | COLMAP `feature_extractor` | GPU SIFT, one shared `SIMPLE_RADIAL` camera |
| 2 | COLMAP matcher | `exhaustive_matcher` up to 450 frames; above that `sequential_matcher` with loop detection (overlap 20, faiss vocabulary tree) so a walk that returns to its start closes the loop |
| 3 | COLMAP `mapper` | Camera poses and sparse points |
| 4 | `convert.py --skip_matching` | Undistorts the images and writes the layout OpenSplat reads |
| 5 | `timeline.py` | Registration check: how many frames got a pose and where the gaps are (default must be ≥ 85 %) |
| 6 | OpenSplat `-n 30000 --keep-crs` | Trains the Gaussian splat. `--keep-crs` keeps COLMAP's coordinate frame, so later POIs and paths line up with the camera poses |

30 000 steps is deliberate: OpenSplat starts at a quarter of the image resolution and doubles it every 3 000 steps, so a 3 000-step run never leaves quarter resolution and looks blurry.

## Tested environment

The pinned versions that produced our models (full pip lock in `Image_to_3D/environment/`):

| | |
|---|---|
| OS | Ubuntu 26.04 LTS |
| GPU | NVIDIA GeForce RTX 5050 Laptop, 8 GB, compute capability 12.0, driver 595.99.02 |
| CUDA toolkit | 12.8 (nvcc 12.8.93) |
| Python | 3.10.22 |
| PyTorch | 2.11.0+cu128 |
| COLMAP | 3.12.6, built with CUDA |
| System libraries | OpenCV 4.10, Ceres 2.2.0, Eigen 3.4.0, CMake 4.2.3, GCC 15.2 |
| ImageMagick | 7.1.2 (only for `convert.py --resize`) |

**An NVIDIA GPU is required.** Training and COLMAP feature extraction both use CUDA.

## Reproduce

Run from `Image_to_3D/`. You need Python 3.10, COLMAP built with CUDA, the CUDA toolkit matching PyTorch's CUDA version, CMake and OpenCV development headers (`libopencv-dev`).

```bash
cd Image_to_3D
./scripts/setup_env.sh          # creates .venv with the pinned versions
./scripts/build_opensplat.sh    # builds third_party/opensplat against that PyTorch
./scripts/get_vocab_tree.sh     # only needed for videos longer than ~450 frames

# smoke test on the sample frames in test/ (a few minutes, blurry on purpose)
./run_engine.sh test/frames scene_test 40 500
```

Compare the output with `test/expected/summary.txt`. Training is not deterministic, so expect similar numbers, not an identical file.

### Your own video

```bash
./run_engine.sh my_walkthrough.mp4 scene_mine 300 30000     # 2-minute video
./run_engine.sh long_walkthrough.mp4 scene_big 1800 30000   # 10-minute video
```

The model is written to `scene_*/model.ply`. The number after the scene name is the target frame count; about 2.5 frames per second of video worked well for us. The first thing to check is the `registered X of Y` line from `timeline.py`: you want nearly all frames registered and a single model folder.

### Results so far

| Scene | Frames | Registered by COLMAP | OpenSplat |
|---|---|---|---|
| R&D building, 121 s video | 303 (1600 px) | 303 of 303, one model | 30 000 steps, about 30 min |
| R&D building, 10 min video | 1881 (1600 px) | 1859 of 1881, one model | 30 000 steps (result to be added) |

## Large scenes (cell-based training)

**TODO: add the exact `split_cells.py` and `merge_cells.py` commands.** Very large floors are split into spatial cells on the floor plane, each cell is trained independently, and the results are merged by keeping, for every Gaussian, only the cell whose centroid is nearest.

## Web viewer

Run from the viewer folder (**TODO: folder name**):

```bash
bun install && bun run dev
```

- A venue is pure data under `public/venues/<id>/`: the splat plus a `config.json` (model rotation, scale, position, floor height, spawn point, player radius, `walkable` and `obstacles` polygons). Adding a venue needs no code change. Open it at `/#/<venueId>`.
- The trained `.ply` is converted to `model.compressed.ply` before it is served. **TODO: the exact command or tool used for this conversion.**
- GitHub Actions builds and deploys the viewer to GitHub Pages on every push to `main`. Models are stored with Git LFS.
- Controls: click to capture the mouse, WASD to move, Shift to sprint. In the dev build, `P` logs the spawn coordinates, `C` adds a polygon corner, `X` undoes, `V` prints the polygon.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Failed to read faiss index` from COLMAP | The vocabulary tree is the old flann format. COLMAP ≥ 3.12 needs the `vocab_tree_faiss_*` file: run `scripts/get_vocab_tree.sh` |
| `run_engine.sh` says colmap has no CUDA | Another COLMAP (for example the distro package) is first in `PATH`. Put the CUDA build first |
| `build_opensplat.sh` cannot find CUDA, or nvcc is the wrong version | The build needs the toolkit matching PyTorch's CUDA (12.8 here), not whichever is first in `PATH`. Set `CUDA_HOME=/usr/local/cuda-12.8` |
| nvcc rejects your GCC | Install an older g++ and set `CUDA_HOST_COMPILER=/usr/bin/g++-14` (not needed on every system) |
| `undefined symbol: _ZNK3c105Error4whatEv` when running OpenSplat | OpenSplat was built against a different libtorch. Rebuild with `scripts/build_opensplat.sh` after any change to the venv |
| COLMAP makes several model folders | The video broke into pieces and only model 0 is used. Re-record the gap `timeline.py` shows, or add more matching |
| OpenSplat runs out of memory | `OPENSPLAT_ARGS="-d 2" ./run_engine.sh ...` halves the training resolution |
| Do not run `convert.py` without `--skip_matching` | It would do its own exhaustive matching and uses old GPU option names |

## Credits and licences

Built on open-source work, used under their licences (details in [`NOTICE.md`](NOTICE.md)): COLMAP, OpenSplat, the Inria `gaussian-splatting` conversion script, and for the viewer Three.js, Spark, React, Vite, Tailwind CSS and Zustand.
