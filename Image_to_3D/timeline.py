import sys, os
sys.path.insert(0, "pipeline/gaussian-splatting/utils")
import read_write_model as rwm
S = sys.argv[1]
ims = rwm.read_images_binary(f"{S}/distorted/sparse/0/images.bin")
reg = {im.name for im in ims.values()}
allf = sorted(os.listdir(f"{S}/input"))
print("registered", len(reg), "of", len(allf))
print("".join("#" if f in reg else "." for f in allf))