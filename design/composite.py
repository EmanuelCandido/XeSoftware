"""Encaixa as interfaces renderizadas (design/screens/*.png) nas telas das fotos reais.

Uso: python design/composite.py  -> gera assets/img/services/<id>.webp e <id>-sm.webp
"""
import os

import cv2
import numpy as np
from PIL import Image

from detect_screens import SCENES, detect

HERE = os.path.dirname(os.path.abspath(__file__))
# Trabalha em 2x: a foto é ampliada e a interface é encaixada em alta resolução,
# para que a versão "-xl" (usada no zoom) mostre o conteúdo da tela com nitidez.
SCALE = 2
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "img", "services")

# serviço: (foto, tela, raio dos cantos (px da tela renderizada), expansão do quadrilátero, zoom do recorte)
#   expansão > 1 cobre a sobra clara nos cantos arredondados da tela original
#   zoom < 1 aproxima o recorte em volta do aparelho
JOBS = {
    "websites": ("scene-ipad.jpg", "law.png", 46, (1.026, 1.045), 1.0),
    "ecommerce": ("scene-laptop-wood.jpg", "shop.png", 10, 1.004, 1.0),
    "sistemas": ("scene-imac.jpg", "dash.png", 4, 1.004, 0.82),
    "seo": ("scene-laptop-room.jpg", "seo.png", 10, 1.004, 0.82),
}


def rounded_mask(w, h, r):
    m = np.zeros((h, w), np.uint8)
    if r <= 0:
        m[:] = 255
        return m
    cv2.rectangle(m, (r, 0), (w - r, h), 255, -1)
    cv2.rectangle(m, (0, r), (w, h - r), 255, -1)
    for cx, cy in ((r, r), (w - r, r), (r, h - r), (w - r, h - r)):
        cv2.circle(m, (cx, cy), r, 255, -1, lineType=cv2.LINE_AA)
    return m


def composite(service, photo_name, screen_name, radius, expand, zoom):
    photo = cv2.imread(os.path.join(HERE, "photos", photo_name))
    photo = cv2.resize(photo, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_LANCZOS4).astype(np.float32) / 255
    screen = cv2.imread(os.path.join(HERE, "screens", screen_name)).astype(np.float32) / 255
    H, W = photo.shape[:2]
    sh, sw = screen.shape[:2]

    quad = detect(photo_name, *SCENES[photo_name])
    ex, ey = expand if isinstance(expand, tuple) else (expand, expand)
    center = quad.mean(0)
    quad = (center + (quad - center) * np.float32([ex, ey])) * SCALE

    src = np.float32([[0, 0], [sw, 0], [sw, sh], [0, sh]])
    M = cv2.getPerspectiveTransform(src, quad)

    # Tela levemente mais "física": contraste e saturação um pouco menores, como em uma foto real
    gray = screen.mean(2, keepdims=True)
    screen = gray + (screen - gray) * 0.94
    screen = screen * 0.96 + 0.015

    warped = cv2.warpPerspective(screen, M, (W, H), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT)
    mask = rounded_mask(sw, sh, radius).astype(np.float32) / 255
    wmask = cv2.warpPerspective(mask, M, (W, H), flags=cv2.INTER_LINEAR)
    wmask = cv2.GaussianBlur(wmask, (5, 5), 0)[..., None]

    # Reflexo diagonal sutil sobre o vidro
    yy, xx = np.mgrid[0:sh, 0:sw].astype(np.float32)
    t = (xx / sw * 0.75 + yy / sh * 0.45)
    glare = np.clip(1.0 - np.abs(t - 0.38) / 0.22, 0, 1) ** 2 * 0.07
    glare += (1 - yy / sh) * 0.025
    wglare = cv2.warpPerspective(glare, M, (W, H))[..., None]

    out = photo * (1 - wmask) + warped * wmask
    out = out + (1 - out) * wglare * wmask
    out = (np.clip(out, 0, 1) * 255).astype(np.uint8)

    img = Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))
    # Recorte 16:10 centrado no aparelho
    ch = int(H * zoom)
    cw = int(round(ch * 1.6))
    if cw > W:
        cw = W
        ch = int(round(cw / 1.6))
    devx, devy = float(quad[:, 0].mean()), float(quad[:, 1].mean())
    # o aparelho inteiro (base/teclado) fica um pouco abaixo do centro da tela
    devy += (quad[:, 1].max() - quad[:, 1].min()) * 0.28
    x0 = int(min(max(devx - cw / 2, 0), W - cw))
    y0 = int(min(max(devy - ch / 2, 0), H - ch))
    img = img.crop((x0, y0, x0 + cw, y0 + ch))

    os.makedirs(OUT, exist_ok=True)
    img.resize((2000, 1250), Image.LANCZOS).save(os.path.join(OUT, f"{service}.webp"), "WEBP", quality=88, method=6)
    img.resize((1000, 625), Image.LANCZOS).save(os.path.join(OUT, f"{service}-sm.webp"), "WEBP", quality=84, method=6)
    img.resize((3600, 2250), Image.LANCZOS).save(os.path.join(OUT, f"{service}-xl.webp"), "WEBP", quality=86, method=6)
    print(service, "ok", img.size)


if __name__ == "__main__":
    for service, job in JOBS.items():
        composite(service, *job)
