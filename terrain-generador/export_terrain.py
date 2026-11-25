#!/usr/bin/env python3
"""Exporta el relieve (HGT) y la máscara tierra-mar (LANDMASK) de las mallas d01, d02 y d03
de un dominio WRF leyendo un wrfout por OPeNDAP (THREDDS). Recorta todas las mallas a la misma
ventana (la de la malla más fina, con un margen) para compararlas en api.html.

Uso (con el túnel SSH abierto si trabajas en local):
  python3 export_terrain.py --url "http://127.0.0.1:8082/<ruta>/wrfout_{grid}_2026-11-02_00:00:00" \
                            --grids d01,d02,d03 --out terrain_panama.npz

{grid} se sustituye por d01, d02 y d03. Basta un archivo cualquiera de una corrida:
HGT y LANDMASK son campos fijos. Solo lee esas variables y las coordenadas (pocos MB).
"""
import argparse
import sys
import numpy as np
from netCDF4 import Dataset


def read(url):
    with Dataset(url) as nc:
        lat = np.array(nc.variables['XLAT'][0])
        lon = np.array(nc.variables['XLONG'][0])
        hgt = np.array(nc.variables['HGT'][0])
        lm = np.array(nc.variables['LANDMASK'][0])
        dx = float(getattr(nc, 'DX', np.nan)) / 1000.0
    return lat, lon, hgt, lm, dx


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', required=True, help='URL OPeNDAP del wrfout con {grid}')
    ap.add_argument('--grids', default='d01,d02,d03')
    ap.add_argument('--margin', type=float, default=0.3, help='margen en grados alrededor de la malla más fina')
    ap.add_argument('--out', default='terrain.npz')
    a = ap.parse_args()

    if '{grid}' not in a.url:
        ap.error('la URL debe llevar {grid} donde va d01/d02/d03 (si no, se lee la misma malla tres veces)')
    grids = [g.strip() for g in a.grids.split(',') if g.strip()]
    data = {}
    for g in grids:
        url = a.url.replace('{grid}', g)
        print(f'Leyendo {g} …', file=sys.stderr)
        data[g] = read(url)

    # Ventana común: extensión de la malla más fina, con margen
    lat, lon = data[grids[-1]][0], data[grids[-1]][1]
    s, n = float(lat.min()) - a.margin, float(lat.max()) + a.margin
    w, e = float(lon.min()) - a.margin, float(lon.max()) + a.margin

    out = {'window': np.array([s, w, n, e])}
    for g in grids:
        lat, lon, hgt, lm, dx = data[g]
        rows = np.where(((lat >= s) & (lat <= n)).any(axis=1))[0]
        cols = np.where(((lon >= w) & (lon <= e)).any(axis=0))[0]
        r0, r1, c0, c1 = rows.min(), rows.max() + 1, cols.min(), cols.max() + 1
        out[f'{g}_lat'] = lat[r0:r1, c0:c1].astype(np.float32)
        out[f'{g}_lon'] = lon[r0:r1, c0:c1].astype(np.float32)
        out[f'{g}_hgt'] = hgt[r0:r1, c0:c1].astype(np.float32)
        out[f'{g}_lm'] = lm[r0:r1, c0:c1].astype(np.uint8)
        out[f'{g}_dx'] = np.array(dx)
        print(f'{g}: {r1 - r0}x{c1 - c0} puntos, dx={dx:.1f} km, altura máx. {hgt[r0:r1, c0:c1].max():.0f} m', file=sys.stderr)

    np.savez_compressed(a.out, **out)
    print(f'Guardado {a.out}', file=sys.stderr)


if __name__ == '__main__':
    main()


# T=2026-11-23_00:00:00
# python3 export_terrain.py --url "http://127.0.0.1:8082/panama/dodsC/OUTPUTS-Pan/wrfout_{grid}_$T" --grids d01,d02,d03 --out terrain_panama.npz

# python3 export_terrain.py --url "http://127.0.0.1:8082/panama/dodsC/OUTPUTS-CA/wrfout_{grid}_$T" --grids d01,d02 --out terrain_centro_america.npz

# python3 export_terrain.py --url "http://127.0.0.1:8083/cuba/dodsC/OUTPUTS_1W/wrfout_{grid}_$T" --grids d01,d02,d03 --out terrain_cuba.npz

# python3 export_terrain.py --url "http://127.0.0.1:8083/dominica/dodsC/OUTPUTS-Dom/wrfout_{grid}_$T" --grids d01,d02,d03,d04 --out terrain_dominica.npz

# python3 export_terrain.py --url "http://127.0.0.1:8086/mexico/dodsC/OUTPUTS-MX/wrfout_{grid}_$T" --grids d01,d02 --out terrain_mexico.npz

# python3 export_terrain.py --url "http://127.0.0.1:8084/dominicana/dodsC/OUTPUTS/wrfout_{grid}_$T" --grids d01,d02 --out terrain_dominicana.npz