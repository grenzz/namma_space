import cv2, sys, os
video, out, target = sys.argv[1], sys.argv[2], int(sys.argv[3])
maxside = int(sys.argv[4]) if len(sys.argv) > 4 else 1600
os.makedirs(out, exist_ok=True)
cap = cv2.VideoCapture(video)
n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
win = max(1, n // target)
best, best_s, idx, saved = None, -1, 0, 0
while True:
    ok, f = cap.read()
    if not ok: break
    s = cv2.Laplacian(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
    if s > best_s: best, best_s = f, s
    idx += 1
    if idx % win == 0:
        h, w = best.shape[:2]; k = maxside / max(h, w)
        if k < 1: best = cv2.resize(best, (int(w*k), int(h*k)), interpolation=cv2.INTER_AREA)
        cv2.imwrite(f"{out}/img_{saved:04d}.jpg", best, [cv2.IMWRITE_JPEG_QUALITY, 95])
        saved += 1; best, best_s = None, -1
print("saved", saved)