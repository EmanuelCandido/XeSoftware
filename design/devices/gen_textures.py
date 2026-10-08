"""Gera o layout do teclado (keys.json) e as texturas usadas pelo notebook 3D.

Uso: python design/devices/gen_textures.py
Saída em design/devices/tex/: keys.json, keyboard.png (legendas brancas em fundo
preto, cobrindo a área do teclado) e grille.png (furos das grades de som).
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "tex")
os.makedirs(OUT, exist_ok=True)

KW = 26.3  # largura da área das teclas (cm), 14,5 unidades
U = KW / 14.5
GAP = 0.17
FN_H = 0.62  # fileira de funções, em unidades

# (legenda, largura em unidades, estilo) — estilo: c=centro, n=número (2 linhas), l/r=modificador
ROWS = [
    [("esc", 1.5, "l")] + [(f"F{i}", 1, "f") for i in range(1, 13)] + [("", 1, "touch")],
    [("~\n`", 1, "n"), ("!\n1", 1, "n"), ("@\n2", 1, "n"), ("#\n3", 1, "n"), ("$\n4", 1, "n"), ("%\n5", 1, "n"), ("^\n6", 1, "n"),
     ("&\n7", 1, "n"), ("*\n8", 1, "n"), ("(\n9", 1, "n"), (")\n0", 1, "n"), ("_\n-", 1, "n"), ("+\n=", 1, "n"), ("delete", 1.5, "r")],
    [("tab", 1.5, "l")] + [(c, 1, "c") for c in "QWERTYUIOP"] + [("{\n[", 1, "n"), ("}\n]", 1, "n"), ("|\n\\", 1, "n")],
    [("caps lock", 1.75, "l")] + [(c, 1, "c") for c in "ASDFGHJKL"] + [(":\n;", 1, "n"), ('"\n\'', 1, "n"), ("return", 1.75, "r")],
    [("shift", 2.25, "l")] + [(c, 1, "c") for c in "ZXCVBNM"] + [("<\n,", 1, "n"), (">\n.", 1, "n"), ("?\n/", 1, "n"), ("shift", 2.25, "r")],
    [("fn", 1, "l"), ("control", 1, "l"), ("option", 1, "l"), ("command", 1.25, "r"), ("", 5, "c"), ("command", 1.25, "l"), ("option", 1, "l"), ("ARROWS", 3, "arrows")],
]

KH = (FN_H + 5) * U
keys = []
y = KH / 2
for r, row in enumerate(ROWS):
    h = FN_H * U if r == 0 else U
    cy = y - h / 2
    x = -KW / 2
    for label, w, style in row:
        wu = w * U
        if style == "arrows":
            hw, hh = U - GAP, (U - GAP) / 2 - 0.04
            bx = x
            # inverted T: left, up/down stacked, right (half-height keys)
            keys.append({"label": "◀", "style": "c", "x": bx + U / 2, "y": cy - U / 4 + 0.02, "w": hw, "h": hh})
            keys.append({"label": "▲", "style": "c", "x": bx + 1.5 * U, "y": cy + U / 4 - 0.02, "w": hw, "h": hh})
            keys.append({"label": "▼", "style": "c", "x": bx + 1.5 * U, "y": cy - U / 4 + 0.02, "w": hw, "h": hh})
            keys.append({"label": "▶", "style": "c", "x": bx + 2.5 * U, "y": cy - U / 4 + 0.02, "w": hw, "h": hh})
        else:
            keys.append({"label": label, "style": style, "x": x + wu / 2, "y": cy, "w": wu - GAP, "h": h - GAP})
        x += wu
    y -= h

json.dump({"KW": KW, "KH": KH, "keys": keys}, open(os.path.join(OUT, "keys.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- legend texture
PX = 110  # px por cm
W, H = int(KW * PX), int(KH * PX)
img = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(img)
fonts = "C:/Windows/Fonts/"
f_big = ImageFont.truetype(fonts + "segoeui.ttf", int(0.42 * PX))
f_num = ImageFont.truetype(fonts + "segoeui.ttf", int(0.3 * PX))
f_mod = ImageFont.truetype(fonts + "segoeui.ttf", int(0.24 * PX))
f_sym = ImageFont.truetype(fonts + "seguisym.ttf", int(0.24 * PX))


def to_px(x, y):
    return (x + KW / 2) * PX, (KH / 2 - y) * PX


for k in keys:
    cx, cy = to_px(k["x"], k["y"])
    w, h = k["w"] * PX, k["h"] * PX
    lab, st = k["label"], k["style"]
    if not lab and st != "touch":
        continue
    if st == "touch":
        r = min(w, h) * 0.32
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=70, width=3)
    elif st == "c":
        font = f_sym if lab in "◀▲▼▶" else f_big
        d.text((cx, cy), lab, fill=235, font=font, anchor="mm")
    elif st == "n":
        a, b = lab.split("\n")
        d.text((cx, cy - h * 0.2), a, fill=225, font=f_num, anchor="mm")
        d.text((cx, cy + h * 0.2), b, fill=225, font=f_num, anchor="mm")
    elif st == "f":
        d.text((cx, cy + h * 0.18), lab, fill=215, font=f_mod, anchor="mm")
    elif st == "l":
        d.text((cx - w / 2 + 0.14 * PX, cy + h / 2 - 0.12 * PX), lab, fill=225, font=f_mod, anchor="ld")
    elif st == "r":
        d.text((cx + w / 2 - 0.14 * PX, cy + h / 2 - 0.12 * PX), lab, fill=225, font=f_mod, anchor="rd")
img.save(os.path.join(OUT, "keyboard.png"))

# ---------------------------------------------------------------- speaker grille (hex grid of holes)
GW, GH = 300, 2200
g = Image.new("L", (GW, GH), 0)
gd = ImageDraw.Draw(g)
step, rr = 30, 7
row = 0
for yy in range(20, GH - 10, int(step * 0.866)):
    off = step / 2 if row % 2 else 0
    xx = 22 + off
    while xx < GW - 15:
        gd.ellipse((xx - rr, yy - rr, xx + rr, yy + rr), fill=255)
        xx += step
    row += 1
g.save(os.path.join(OUT, "grille.png"))
print("keys:", len(keys), "texture:", W, "x", H, "KH:", round(KH, 3))
