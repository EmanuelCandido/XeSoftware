#!/usr/bin/env bash
# Gera as imagens da seção de serviços:
#   1. renderiza cada interface "achatada" a partir de design/mockups.html (?screen=...)
#   2. encaixa a interface em perspectiva na tela de uma foto real (design/composite.py)
# Requisitos: servidor local na raiz (python -m http.server 5173), Microsoft Edge,
# Python com Pillow, numpy e opencv-python-headless.
set -euo pipefail
cd "$(dirname "$0")/.."

EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
[ -f "$EDGE" ] || EDGE="/c/Program Files/Microsoft/Edge/Application/msedge.exe"

mkdir -p design/screens
OUTDIR=$(cygpath -w "$PWD/design/screens")

render() { # nome largura altura
  "$EDGE" --headless=new --hide-scrollbars --force-device-scale-factor=2 \
    --window-size="$2,$3" --virtual-time-budget=6000 \
    --screenshot="$OUTDIR\\$1.png" \
    "http://localhost:5173/design/mockups.html?screen=$1" >/dev/null 2>&1
}

render law 1180 826
render shop 1280 800
render dash 1350 800
render seo 1280 800

cd design && python composite.py
