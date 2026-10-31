import sys, shutil, os
import numpy as np
sys.path.insert(0, "pipeline/gaussian-splatting/utils")
import read_write_model as rwm

scene, out, step = sys.argv[1], sys.argv[2], int(sys.argv[3])
ims = rwm.read_images_binary(f"{scene}/sparse/0/images.bin")
names, C, D = [], [], []
for im in ims.values():
    R = im.qvec2rotmat()
    C.append(-R.T @ im.tvec)          # camera position
    D.append(R.T @ np.array([0, 0, 1.0]))  # viewing direction
    names.append(im.name)
C, D = np.array(C), np.array(D)
scale = np.linalg.norm(C - C.mean(0), axis=1).mean()

def dist(i, j):
    return np.linalg.norm(C[i] - C[j]) + 0.5 * scale * np.linalg.norm(D[i] - D[j])

left = set(range(len(names)))
cur = min(left, key=lambda i: C[i][0]); order = [cur]; left.remove(cur)
while left:
    cur = min(left, key=lambda j: dist(order[-1], j))
    order.append(cur); left.remove(cur)

os.makedirs(out, exist_ok=True)
for k, i in enumerate(order[::step]):
    shutil.copy(f"{scene}/images/{names[i]}", f"{out}/{k:04d}_{names[i]}")
print("wrote", len(order[::step]), "images")