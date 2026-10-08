#!/usr/bin/env bash
# Renderiza as imagens da seção de serviços a partir de design/mockups.html.
# Requisitos: servidor local na raiz do projeto (python -m http.server 5173), Microsoft Edge e Python com Pillow.
set -euo pipefail
cd "$(dirname "$0")/.."

EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
[ -f "$EDGE" ] || EDGE="/c/Program Files/Microsoft/Edge/Application/msedge.exe"

OUT=assets/img/services
TMP=$(mktemp -d)
mkdir -p "$OUT"
names=(websites ecommerce sistemas seo)

for i in 1 2 3 4; do
  "$EDGE" --headless=new --hide-scrollbars --force-device-scale-factor=2 \
    --window-size=1600,1000 --virtual-time-budget=6000 \
    --screenshot="$(cygpath -w "$TMP")\\s$i.png" \
    "http://localhost:5173/design/mockups.html?scene=$i" >/dev/null 2>&1
done

python - "$TMP" "$OUT" "${names[@]}" <<'PY'
import sys
from PIL import Image
tmp, out, *names = sys.argv[1:]
for i, name in enumerate(names, 1):
    im = Image.open(f"{tmp}/s{i}.png").convert("RGB")
    im.resize((2000, 1250), Image.LANCZOS).save(f"{out}/{name}.webp", "WEBP", quality=88, method=6)
    im.resize((1000, 625), Image.LANCZOS).save(f"{out}/{name}-sm.webp", "WEBP", quality=84, method=6)
    print(name, im.size)
PY
rm -rf "$TMP" 2>/dev/null || true
