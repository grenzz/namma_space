import sys, os, shutil, random
sys.path.insert(0, "pipeline/gaussian-splatting/utils")
import read_write_model as rwm
random.seed(0)
d = "storage/outputs/test_project_001/dataset/sparse/0"
src, dst = f"{d}/points3D.txt", f"{d}/points3D_small.txt"
kept = 0
with open(src) as f, open(dst, "w") as o:
    for line in f:
        if line.startswith("#"): o.write(line)
        elif random.random() < 0.1: o.write(line); kept += 1
print("kept", kept)
os.replace(src, f"{d}/points3D_full.txt.bak")
shutil.move(dst, src)
cams = rwm.read_cameras_text(f"{d}/cameras.txt")
ims  = rwm.read_images_text(f"{d}/images.txt")
pts  = rwm.read_points3D_text(src)
rwm.write_model(cams, ims, pts, path=d, ext=".bin")
print("done")