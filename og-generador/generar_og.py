#!/usr/bin/env python3
"""
Generador de la imagen para compartir la API (og-api.jpg, 1200x630).

Parte de un fondo fijo (og-base.png: degradado, remolino, logotipo B1TMET y título
"WRF Forecast API") y dibuja encima el texto que cambia: subtítulo, las tres
"píldoras" y la dirección web. Fuente: Inter (Regular y SemiBold), carpeta fuentes/.

Uso:
    python generar_og.py                         # usa los textos de abajo
    python generar_og.py --subtitulo "Caribbean & Central America · up to 0.6 km" \
                         --pildoras "7 domains" "27 · 9 · 3 · 0.6 km" "4 runs/day · 72 h" \
                         --url "b1tmet.github.io/api" --salida og-api.jpg

Requisitos: pip install pillow numpy
"""
import argparse, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FUENTES = os.path.join(AQUI, "fuentes")
REGULAR = os.path.join(FUENTES, "Inter-Regular.otf")
SEMIBOLD = os.path.join(FUENTES, "Inter-SemiBold.otf")

# ---- Textos por defecto (los de la versión actual) ----
SUBTITULO = "Caribbean & Central America · up to 0.6 km"
PILDORAS = ["7 domains", "27 · 9 · 3 · 0.6 km", "4 runs/day · 72 h"]
URL = "b1tmet.github.io/api"

# ---- Estilo (medido sobre la imagen original) ----
SUB_SIZE, SUB_X, SUB_BASE, SUB_COLOR = 30.0, 80.0, 334.75, (220, 214, 255)
URL_SIZE, URL_RIGHT, URL_BASE, URL_COLOR = 22.0, 1120.0, 544.75, (158, 176, 255)
PILL_TOP, PILL_H, PILL_LEFT, PILL_GAP, PILL_PAD = 512, 48, 80, 14, 42   # PAD = 21 px por lado
PILL_SIZE, PILL_BASE = 22.0, 543.75
PILL_FILL, PILL_BORDER = 0.10, 0.30        # opacidad del relleno y del borde (blanco)
SS = 4                                      # supermuestreo para suavizar bordes y texto


def _cov_text(shape, text, font_path, size, x, base):
    """Cobertura (0-1) del texto, anclado en (x, base) sobre la línea base."""
    h, w = shape
    img = Image.new("L", (w * SS, h * SS), 0)
    f = ImageFont.truetype(font_path, size * SS)
    ImageDraw.Draw(img).text((x * SS, base * SS), text, font=f, fill=255, anchor="ls")
    return np.asarray(img.resize((w, h), Image.BOX), np.float32) / 255.0


def _cov_pill(shape, x0, x1, y0, y1, inset=0.0):
    h, w = shape
    img = Image.new("L", (w * SS, h * SS), 0)
    r = (y1 - y0) / 2 - inset
    ImageDraw.Draw(img).rounded_rectangle(
        [(x0 + inset) * SS, (y0 + inset) * SS, (x1 - inset) * SS - 1, (y1 - inset) * SS - 1],
        radius=r * SS, fill=255)
    return np.asarray(img.resize((w, h), Image.BOX), np.float32) / 255.0


def _mezcla(img, cov, color, alpha=1.0):
    a = (cov * alpha)[..., None]
    return img * (1 - a) + np.array(color, np.float32) * a


def diseno_pildoras(textos):
    """Posición (izq, der) de cada píldora: ancho = texto + 42 px, separación 14 px."""
    f = ImageFont.truetype(SEMIBOLD, PILL_SIZE)
    x, cajas = float(PILL_LEFT), []
    for t in textos:
        w = f.getlength(t) + PILL_PAD
        cajas.append((int(round(x)), int(round(x + w))))
        x += w + PILL_GAP
    return cajas


def generar(base, salida, subtitulo=SUBTITULO, pildoras=PILDORAS, url=URL, calidad=92):
    img = np.asarray(Image.open(base).convert("RGB"), np.float32)
    h, w, _ = img.shape
    shape = (h, w)

    # subtítulo
    img = _mezcla(img, _cov_text(shape, subtitulo, REGULAR, SUB_SIZE, SUB_X, SUB_BASE), SUB_COLOR)

    # píldoras: relleno translúcido, borde de 1 px y texto
    for texto, (x0, x1) in zip(pildoras, diseno_pildoras(pildoras)):
        y0, y1 = PILL_TOP, PILL_TOP + PILL_H
        exterior = _cov_pill(shape, x0, x1, y0, y1)
        interior = _cov_pill(shape, x0, x1, y0, y1, inset=1.0)
        img = _mezcla(img, exterior, (255, 255, 255), PILL_FILL)
        img = _mezcla(img, np.clip(exterior - interior, 0, 1), (255, 255, 255), PILL_BORDER)
        img = _mezcla(img, _cov_text(shape, texto, SEMIBOLD, PILL_SIZE, x0 + PILL_PAD / 2, PILL_BASE),
                      (255, 255, 255))

    # dirección web, alineada a la derecha
    fu = ImageFont.truetype(REGULAR, URL_SIZE)
    x_url = URL_RIGHT - fu.getlength(url)
    img = _mezcla(img, _cov_text(shape, url, REGULAR, URL_SIZE, x_url, URL_BASE), URL_COLOR)

    out = Image.fromarray(np.clip(img + 0.5, 0, 255).astype(np.uint8))
    out.save(salida, quality=calidad, subsampling=0, optimize=True)
    return salida


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Genera og-api.jpg")
    ap.add_argument("--base", default=os.path.join(AQUI, "og-base.png"))
    ap.add_argument("--salida", default=os.path.join(AQUI, "og-api.jpg"))
    ap.add_argument("--subtitulo", default=SUBTITULO)
    ap.add_argument("--pildoras", nargs=3, default=PILDORAS, metavar=("P1", "P2", "P3"))
    ap.add_argument("--url", default=URL)
    a = ap.parse_args()
    print("creada", generar(a.base, a.salida, a.subtitulo, a.pildoras, a.url))


# python generar_og.py --subtitulo "Caribbean & Central America · up to 0.6 km" \
#                         --pildoras "7 domains" "27 · 9 · 3 · 0.6 km" "4 runs/day · 72 h" \
#                         --url "b1tmet.github.io/api" --salida og-api.jpg
