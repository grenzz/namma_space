import sys, numpy as np
sys.path.insert(0, "pipeline/gaussian-splatting/utils")
import read_write_model as rwm
ims = rwm.read_images_binary(sys.argv[1] + "/sparse/0/images.bin")
items = sorted(ims.values(), key=lambda im: im.name)
C = np.array([-im.qvec2rotmat().T @ im.tvec for im in items])
consec = np.linalg.norm(C[1:] - C[:-1], axis=1)
d = np.linalg.norm(C[:, None] - C[None], axis=2); np.fill_diagonal(d, 1e9)
print("median gap between consecutive files:", np.median(consec))
print("median gap to nearest camera anywhere:", np.median(d.min(1)))
print("typical scene size:", np.linalg.norm(C - C.mean(0), axis=1).mean())