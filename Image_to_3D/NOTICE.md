# Third-party components

| Component | Where | Licence | Note |
|---|---|---|---|
| OpenSplat | `third_party/opensplat/` | AGPL-3.0 | Source included; its licence file stays in that folder |
| 3D Gaussian Splatting, `convert.py` (Inria / GraphDeco) | `convert.py` | Inria Gaussian-Splatting licence (non-commercial research use) | Copy of the Inria script; keep its header and the licence file `LICENSE-inria-convert.md` |
| COLMAP, `read_write_model.py` | `read_write_model.py` | BSD-3-Clause | Reads COLMAP's binary models |
| COLMAP | used as an external program | BSD-3-Clause | Not included |
| PyTorch, NumPy, OpenCV | pinned in `environment/` | their own licences | Installed from PyPI, not included |

The web viewer's dependencies (Three.js, Spark, React, Vite, Tailwind CSS, Zustand) are listed in its `package.json`.
