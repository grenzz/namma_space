import os, sys, json, shutil
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import read_write_model as rwm

scene, out, K = sys.argv[1], sys.argv[2], int(sys.argv[3])
max_images = int(sys.argv[4]) if len(sys.argv) > 4 else 300
min_obs = int(sys.argv[5]) if len(sys.argv) > 5 else 20
max_points = int(sys.argv[6]) if len(sys.argv) > 6 else 600000
rng = np.random.default_rng(0)

cams, ims, pts = rwm.read_model(os.path.join(scene, "sparse", "0"), ext=".bin")
iids = np.array(sorted(ims))
up = -np.mean([ims[i].qvec2rotmat()[1] for i in iids], axis=0)
up /= np.linalg.norm(up)
a = np.array([1., 0., 0.]) if abs(up[0]) < 0.9 else np.array([0., 1., 0.])
e1 = np.cross(up, a); e1 /= np.linalg.norm(e1); e2 = np.cross(up, e1)

pid = np.array(list(pts.keys()))
P = np.array([pts[p].xyz for p in pid])
P2 = np.c_[P @ e1, P @ e2]
lo, hi = np.percentile(P2, 1, axis=0), np.percentile(P2, 99, axis=0)
Pin = P2[np.all((P2 >= lo) & (P2 <= hi), axis=1)]

cent = [Pin[0]]
for _ in range(K - 1):
    pool = Pin if len(Pin) < 20000 else Pin[::10]
    d = np.min(np.linalg.norm(pool[:, None] - np.array(cent)[None], axis=2), axis=1)
    cent.append(pool[d.argmax()])
cent = np.array(cent)
for _ in range(30):
    lab = np.linalg.norm(Pin[:, None] - cent[None], axis=2).argmin(1)
    new = np.array([Pin[lab == k].mean(0) if (lab == k).any() else cent[k] for k in range(K)])
    if np.allclose(new, cent): break
    cent = new

Dp = np.linalg.norm(P2[:, None] - cent[None], axis=2)
region = Dp.argmin(1)
near = Dp.min(1)
flat = np.concatenate([pts[p].image_ids for p in pid])
owner = np.repeat(np.arange(len(pid)), [len(pts[p].image_ids) for p in pid])
fidx = np.searchsorted(iids, flat)

os.makedirs(out, exist_ok=True)
for k in range(K):
    core = region[owner] == k
    counts = np.bincount(fidx[core], minlength=len(iids))
    order = np.argsort(-counts)
    sel = iids[[j for j in order[:max_images] if counts[j] >= min_obs]]
    if len(sel) == 0: print(f"cell_{k}: no camera sees this region, skipped"); continue
    seen = np.unique(owner[np.isin(flat, sel)])
    mine = seen[Dp[seen, k] <= 1.3 * near[seen]]
    rest = seen[Dp[seen, k] > 1.3 * near[seen]]
    room = max(0, max_points - len(mine))
    if len(rest) > room: rest = rng.choice(rest, room, replace=False)
    keep = np.unique(np.concatenate([mine, rest]))
    cdir = os.path.join(out, f"cell_{k}")
    os.makedirs(os.path.join(cdir, "images"), exist_ok=True)
    os.makedirs(os.path.join(cdir, "sparse", "0"), exist_ok=True)
    for i in sel:
        src, dst = os.path.join(scene, "images", ims[i].name), os.path.join(cdir, "images", ims[i].name)
        if not os.path.exists(dst):
            try: os.link(src, dst)
            except OSError: shutil.copy(src, dst)
    rwm.write_model(cams, {int(i): ims[int(i)] for i in sel}, {int(pid[j]): pts[int(pid[j])] for j in keep},
                    os.path.join(cdir, "sparse", "0"), ext=".bin")
    print(f"cell_{k}: owns {int((region == k).sum())} points, trains on {len(sel)} images, starts from {len(keep)} points")
json.dump({"centroids2d": cent.tolist(), "e1": e1.tolist(), "e2": e2.tolist(), "up": up.tolist()},
          open(os.path.join(out, "cells.json"), "w"))