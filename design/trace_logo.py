"""Vetoriza o logo XE roxo (fundo branco) em SVG com fundo transparente.

Uso: python design/trace_logo.py <logo.png>
Gera assets/icons/logo-xe-brand.svg e assets/icons/favicon.svg (e PNGs de favicon).
"""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]
img = cv2.imread(src, cv2.IMREAD_COLOR)
h0, w0 = img.shape[:2]
S = 10

big = cv2.resize(img, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
g = big[..., 1].astype(np.float32)  # canal verde: o roxo é escuro nele, o branco é claro
alpha = np.clip((255 - g) / (255 - 70), 0, 1)
alpha = cv2.GaussianBlur(alpha, (0, 0), 5)
mask = (alpha > 0.5).astype(np.uint8) * 255

contours, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
x, y, w, h = cv2.boundingRect(np.vstack([c for c in contours if cv2.contourArea(c) > 2000]))
pad = 4
vx, vy, vw, vh = x - pad, y - pad, w + 2 * pad, h + 2 * pad

parts = []
for c, hi in zip(contours, hier[0]):
    if cv2.contourArea(c) < 2000:
        continue
    eps = 0.0005 * cv2.arcLength(c, True)
    ap = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
    pts = " L".join(f"{px - vx:.1f} {py - vy:.1f}" for px, py in ap)
    parts.append(f"M{pts}Z")
d = "".join(parts)

# Cores do degradê, amostradas do logo original (esquerda → direita)
c1, c2 = "#4116b4", "#9d40f6"
print("viewBox", vw, vh)

grad = (
    f'<linearGradient id="g" x1="0" y1="{vh}" x2="{vw}" y2="0" gradientUnits="userSpaceOnUse">'
    f'<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>'
)
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}" fill="none">'
    f"<defs>{grad}</defs><path fill=\"url(#g)\" fill-rule=\"evenodd\" d=\"{d}\"/></svg>"
)
out = os.path.join(ROOT, "assets", "icons")
open(os.path.join(out, "logo-xe-brand.svg"), "w", encoding="utf-8").write(svg)

# Favicon: o mesmo logo centralizado num quadrado transparente
side = max(vw, vh) * 1.18
ox, oy = (side - vw) / 2, (side - vh) / 2
fav = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side:.0f} {side:.0f}" fill="none">'
    f"<defs>{grad}</defs><g transform=\"translate({ox:.1f} {oy:.1f})\"><path fill=\"url(#g)\" fill-rule=\"evenodd\" d=\"{d}\"/></g></svg>"
)
open(os.path.join(out, "favicon.svg"), "w", encoding="utf-8").write(fav)
print("ok", len(d), "bytes de caminho")
