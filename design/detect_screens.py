"""Detecta o quadrilátero da tela em cada foto de dispositivo (tela branca/cinza ou preta).

Uso: python design/detect_screens.py  -> imprime os cantos e salva prévias em design/photos/_detect_*.jpg
"""
import os
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(HERE, "photos")

# arquivo: (vmin, vmax, smax, estender_topo_ate_a_moldura)
SCENES = {
    "scene-ipad.jpg": (250, 255, 6, False),
    "scene-laptop-wood.jpg": (195, 210, 4, True),
    "scene-imac.jpg": (0, 45, 255, False),
    "scene-laptop-room.jpg": (195, 210, 4, True),
}


def order(pts):
    pts = np.array(pts, dtype=np.float32)
    s = pts.sum(1)
    d = np.diff(pts, axis=1).ravel()
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)], pts[np.argmax(s)], pts[np.argmax(d)]], dtype=np.float32)  # tl, tr, br, bl


def detect(name, vmin, vmax, smax, extend_top):
    img = cv2.imread(os.path.join(PHOTOS, name))
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    v, sat = hsv[..., 2], hsv[..., 1]
    mask = ((v >= vmin) & (v <= vmax) & (sat <= smax)).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    h, w = mask.shape
    best = None
    for c in sorted(contours, key=cv2.contourArea, reverse=True)[:6]:
        area = cv2.contourArea(c)
        if area < 0.02 * w * h or area > 0.9 * w * h:
            continue
        hull = cv2.convexHull(c)
        peri = cv2.arcLength(hull, True)
        for eps in (0.01, 0.02, 0.03, 0.05):
            approx = cv2.approxPolyDP(hull, eps * peri, True)
            if len(approx) == 4:
                best = order(approx.reshape(4, 2))
                break
        if best is None:
            best = order(cv2.boxPoints(cv2.minAreaRect(hull)))
        break
    if best is not None and extend_top:
        # A barra de menu do macOS fica acima da área cinza: sobe até encontrar a moldura preta
        tl, tr = best[0], best[1]
        x = int((tl[0] + tr[0]) / 2)
        y = int((tl[1] + tr[1]) / 2) - 2
        while y > 0 and v[y, x] > 40:
            y -= 1
        dy = (tl[1] + tr[1]) / 2 - (y + 1)
        best[0][1] -= dy
        best[1][1] -= dy
    prev = img.copy()
    if best is not None:
        cv2.polylines(prev, [best.astype(np.int32)], True, (255, 0, 255), 6)
    small = cv2.resize(prev, (w // 3, h // 3))
    cv2.imwrite(os.path.join(PHOTOS, f"_detect_{name}"), small)
    return best


if __name__ == "__main__":
    for name, cfg in SCENES.items():
        q = detect(name, *cfg)
        print(name, None if q is None else q.round(1).tolist())
