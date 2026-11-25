
#!/usr/bin/env python3
"""
B1TMET — Renderizador de terreno WRF.

- Cuba: utiliza LANDMASK.
- Panamá: deriva la máscara terrestre de HGT > 1 m,
  porque LANDMASK vale 1 en todos los puntos.
- Interpolación topográfica Clough-Tocher.
- Relleno de pequeños huecos interiores.
- Salida WebP lossless, una imagen por dominio.

Uso:
    python render_terrain.py test1/terrain_cuba.npz test1/terrain_panama.npz
"""

import argparse
import json
import os
import re

import numpy as np
from PIL import Image
from scipy.interpolate import CloughTocher2DInterpolator
from scipy.spatial import cKDTree
from scipy.ndimage import binary_fill_holes, label, distance_transform_edt


MAXW, MAXH = 2400, 1800
BASEW, BASEH = 1200, 900

SEA = (21, 43, 92)

RAMP = [
    (0.00, (42, 91, 53)),      # Verde oscuro
    (0.08, (55, 116, 57)),     # Verde
    (0.18, (91, 139, 61)),     # Verde oliva
    (0.30, (151, 157, 65)),    # Oliva amarillento
    (0.42, (194, 174, 66)),    # Amarillo
    (0.55, (218, 183, 73)),    # Amarillo dorado
    (0.68, (190, 143, 65)),    # Ocre
    (0.80, (157, 105, 61)),    # Carmelita
    (0.92, (125, 79, 53)),     # Marrón oscuro
    (1.00, (99, 61, 44)),      # Marrón profundo
]

# Umbral de elevación para separar mar y tierra en Panamá.
PANAMA_LAND_THRESHOLD = 1.0

# Tamaño máximo de los huecos interiores que se rellenan,
# expresado en píxeles de la imagen final.
MAX_HOLE_PIXELS = 16

# Evaluación por bloques para no cargar toda la interpolación
# de una imagen de gran tamaño en memoria.
CHUNK_SIZE = 150_000


def get_region(path):
    name = os.path.splitext(os.path.basename(path))[0]
    return re.sub(r"^terrain[_-]", "", name)


def get_grids(z):
    grids = sorted(
        k[:-4] for k in z.files if k.endswith("_lat")
    )

    if not grids:
        raise ValueError("No se encontraron dominios en el NPZ")

    return grids


def make_land_mask(region, hgt, lm):
    """
    Selecciona la fuente de clasificación terrestre.

    Panamá: HGT.
    Resto de regiones: LANDMASK.
    """
    if region.lower().startswith("panama"):
        return np.isfinite(hgt) & (hgt > PANAMA_LAND_THRESHOLD), "HGT"

    return np.isfinite(hgt) & (lm > 0), "LANDMASK"


def make_ramp(height, vmax):
    t = np.clip(height / max(vmax, 1.0), 0, 1)

    # Distribución tonal moderada.
    t = np.power(t, 0.85)

    ramp_t = np.array([r[0] for r in RAMP])
    ramp_c = np.array([r[1] for r in RAMP], dtype=float)

    rgb = np.stack([
        np.interp(t, ramp_t, ramp_c[:, c])
        for c in range(3)
    ], axis=-1)

    return np.clip(rgb, 0, 255).astype(np.uint8)

def fill_small_holes(mask):
    """
    Rellena exclusivamente huecos completamente encerrados
    y de tamaño pequeño.
    """
    filled = binary_fill_holes(mask)
    holes = filled & ~mask

    labels, count = label(holes)

    result = mask.copy()
    total = 0

    for i in range(1, count + 1):
        component = labels == i
        size = int(component.sum())

        if size <= MAX_HOLE_PIXELS:
            result[component] = True
            total += size

    return result, total



def render_grid(
    region, grid, z, output_dir,
    south, west, north, east,
    width, height, k, vmax
):
    print(f"\nProcesando {grid}...")

    lat = np.asarray(z[grid + "_lat"], dtype=float)
    lon = np.asarray(z[grid + "_lon"], dtype=float)
    hgt = np.asarray(z[grid + "_hgt"], dtype=float)
    lm = np.asarray(z[grid + "_lm"])
    dx = float(np.asarray(z[grid + "_dx"]).squeeze())

    valid = (
        np.isfinite(lat)
        & np.isfinite(lon)
        & np.isfinite(hgt)
    )

    land_source, mask_source = make_land_mask(region, hgt, lm)

    valid &= (
        (lat >= south) & (lat <= north)
        & (lon >= west) & (lon <= east)
    )

    if np.count_nonzero(valid & land_source) < 3:
        raise ValueError(
            f"{grid}: no hay suficientes puntos terrestres"
        )

    points = np.column_stack([
        lat[valid] * k,
        lon[valid] * k
    ])

    heights = hgt[valid]
    land = land_source[valid]

    cubic = CloughTocher2DInterpolator(
        points,
        heights,
        fill_value=np.nan,
        tol=1e-6,
        maxiter=400
    )

    tree = cKDTree(points)

    xs = west + (np.arange(width) + 0.5) / width * (east - west)
    ys = north - (np.arange(height) + 0.5) / height * (north - south)

    max_distance = (dx / 111.2) * k * 0.75

    # Imágenes completas del dominio.
    # La máscara se rellenará globalmente, no por bloques.
    land_image = np.zeros((height, width), dtype=bool)
    terrain_image = np.full((height, width), np.nan, dtype=np.float32)

    linear = None
    rows_per_chunk = max(1, CHUNK_SIZE // width)

    # Primera fase: clasificación e interpolación por bloques.
    for row_start in range(0, height, rows_per_chunk):
        row_end = min(height, row_start + rows_per_chunk)

        xx, yy = np.meshgrid(
            xs,
            ys[row_start:row_end]
        )

        pix = np.column_stack([
            (yy * k).ravel(),
            (xx * k).ravel()
        ])

        distances, indices = tree.query(pix, k=1)

        land_map = (
            land[indices]
            & (distances <= max_distance)
        ).reshape(row_end - row_start, width)

        terrain = cubic(pix).reshape(
            row_end - row_start, width
        )

        # Respaldo lineal, creado una sola vez para este dominio.
        missing = land_map & ~np.isfinite(terrain)

        if missing.any():
            if linear is None:
                from scipy.interpolate import LinearNDInterpolator

                linear = LinearNDInterpolator(
                    points,
                    heights,
                    fill_value=np.nan
                )

            terrain_flat = terrain.ravel()
            missing_idx = np.flatnonzero(missing.ravel())

            terrain_flat[missing_idx] = linear(pix[missing_idx])
            terrain = terrain_flat.reshape(
                row_end - row_start, width
            )

        land_image[row_start:row_end] = land_map
        terrain_image[row_start:row_end] = terrain.astype(
            np.float32
        )

    # Segunda fase: rellenar huecos interiores sobre TODO el dominio.
    land_filled, holes_filled = fill_small_holes(land_image)

    added = land_filled & ~land_image

    # Buscar el píxel con elevación válida más cercano.
    # Esto cubre tanto los huecos recién rellenados como los NaN
    # que hayan sobrevivido a las interpolaciones.
    valid_terrain = land_image & np.isfinite(terrain_image)

    missing_terrain = land_filled & ~np.isfinite(terrain_image)

    if missing_terrain.any():
        if not valid_terrain.any():
            raise ValueError(
                f"{grid}: no hay elevaciones válidas para completar el terreno"
            )

        _, nearest = distance_transform_edt(
            ~valid_terrain,
            return_indices=True
        )

        terrain_image[missing_terrain] = terrain_image[
            nearest[0][missing_terrain],
            nearest[1][missing_terrain]
        ]

    # Tercera fase: colorear por bloques, conservando la memoria.
    image = np.empty((height, width, 3), dtype=np.uint8)
    image[:] = SEA

    for row_start in range(0, height, rows_per_chunk):
        row_end = min(height, row_start + rows_per_chunk)

        block_mask = land_filled[row_start:row_end]
        block_terrain = terrain_image[row_start:row_end]

        valid_pixels = block_mask & np.isfinite(block_terrain)

        if valid_pixels.any():
            colors = make_ramp(
                block_terrain[valid_pixels],
                vmax
            )

            image[row_start:row_end][valid_pixels] = colors

    filename = f"terrain-{region.replace('_', '-')}-{grid}.webp"
    output_path = os.path.join(output_dir, filename)

    Image.fromarray(image, "RGB").save(
        output_path,
        "WEBP",
        lossless=True,
        method=6
    )

    land_pixels = np.all(image != SEA, axis=2).sum()

    print(
        f"  {filename}: {width}x{height}, "
        f"DX={dx:g} km, "
        f"tierra={land_pixels:,}, "
        f"huecos rellenados={holes_filled}, "
        f"máscara={mask_source}"
    )

    return [
        grid,
        int(dx) if dx.is_integer() else dx,
        int(np.count_nonzero(valid & land_source)),
        int(round(np.max(hgt[valid & land_source])))
    ]


def render(path, output_dir, max_width, max_height):
    z = np.load(path)
    region = get_region(path)
    grids = get_grids(z)

    # Cada región conserva su propia ventana de recorte.
    if "window" in z:
        south, west, north, east = map(float, z["window"])
    else:
        # Sin ventana explícita: calcular la extensión conjunta
        # de todos los dominios de esta región.
        south = min(float(np.nanmin(z[g + "_lat"])) for g in grids)
        north = max(float(np.nanmax(z[g + "_lat"])) for g in grids)
        west = min(float(np.nanmin(z[g + "_lon"])) for g in grids)
        east = max(float(np.nanmax(z[g + "_lon"])) for g in grids)

    if not (
        np.isfinite([south, west, north, east]).all()
        and south < north
        and west < east
    ):
        raise ValueError(f"{region}: ventana geográfica inválida")

    k = np.cos(np.radians((south + north) / 2))

    dlon = (east - west) * k
    dlat = north - south

    min_dx = min(
        float(np.asarray(z[g + "_dx"]).squeeze())
        for g in grids
    )

    # Resolución calculada independientemente para cada región.
    scale_base = max(
        BASEW / dlon,
        BASEH / dlat,
        111.2 / min_dx
    )

    scale = min(
        scale_base,
        max_width / dlon,
        max_height / dlat
    )

    width = max(1, round(dlon * scale))
    height = max(1, round(dlat * scale))

    # Altura máxima común a los dominios de esta región.
    vmax = 0.0

    for grid in grids:
        hgt = np.asarray(z[grid + "_hgt"], dtype=float)
        lm = np.asarray(z[grid + "_lm"])
        land, _ = make_land_mask(region, hgt, lm)

        if land.any():
            vmax = max(vmax, float(np.nanmax(hgt[land])))

    if vmax <= 0:
        raise ValueError(
            f"{region}: no se encontraron elevaciones terrestres"
        )

    print(f"\nRegión: {region}")
    print(
        f"Recorte: S={south:.5f}, W={west:.5f}, "
        f"N={north:.5f}, E={east:.5f}"
    )
    print(f"Imagen: {width}x{height}")
    print(f"DX mínimo: {min_dx:g} km")
    print(f"Altura máxima: {vmax:.1f} m")

    entries = []

    for grid in grids:
        entry = render_grid(
            region, grid, z, output_dir,
            south, west, north, east,
            width, height, k, vmax
        )
        entries.append(entry)

    return region, {
        "w": width,
        "h": height,
        "g": entries
    }



def main():
    parser = argparse.ArgumentParser()

    parser.add_argument("npz", nargs="+")
    parser.add_argument("--out", default="/tmp/terrain-render")
    parser.add_argument("--max-width", type=int, default=MAXW)
    parser.add_argument("--max-height", type=int, default=MAXH)

    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)

    results = {}

    for path in args.npz:
        print("\n" + "=" * 65)
        print(path)
        print("=" * 65)

        region, result = render(
            path,
            args.out,
            args.max_width,
            args.max_height
        )

        results[region] = result

    print("\nENTRADAS PARA LA CONSTANTE R:")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()


# python3 render_terrain.py terrain_cuba.npz terrain_dominica.npz --out /tmp/prueba   # primero aquí, para revisar
# python3 render_terrain.py terrain_*.npz --out assets                                   # luego todas las regiones