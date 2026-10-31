import os, sys, json
import numpy as np
from plyfile import PlyData, PlyElement

cells_dir, out = sys.argv[1], sys.argv[2]
keep_all = len(sys.argv) > 3 and sys.argv[3] == "all"
meta = json.load(open(os.path.join(cells_dir, "cells.json")))
cent, e1, e2 = np.array(meta["centroids2d"]), np.array(meta["e1"]), np.array(meta["e2"])
parts = []
for k in range(len(cent)):
    p = os.path.join(cells_dir, f"cell_{k}", "model.ply")
    if not os.path.exists(p): print("missing", p); continue
    v = PlyData.read(p)["vertex"].data
    if keep_all:
        parts.append(v)
    else:
        xyz = np.stack([v["x"], v["y"], v["z"]], 1)
        p2 = np.c_[xyz @ e1, xyz @ e2]
        parts.append(v[np.linalg.norm(p2[:, None] - cent[None], axis=2).argmin(1) == k])
    print(f"cell_{k}: kept {len(parts[-1])} of {len(v)} Gaussians")
PlyData([PlyElement.describe(np.concatenate(parts), "vertex")], text=False).write(out)
print("wrote", out)