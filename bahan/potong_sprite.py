# Mengubah gambar referensi pixel art (yang diperbesar) menjadi sprite ukuran asli yang bersih.
from PIL import Image
import numpy as np
SRC = '/tmp/claude-0/-home-user/1eea8bbc-ef8f-5fb5-b8e7-2534c7c3bbfe/images/5.png'
a = np.array(Image.open(SRC).convert('RGB')).astype(float)
boxes = {'bintang': (83, 44, 218, 182), 'hati': (234, 49, 367, 182), 'bubble1': (64, 209, 221, 331),
         'telepon': (252, 209, 359, 331), 'bubble2': (64, 349, 224, 443), 'kucing': (252, 330, 357, 451)}

def grid(box):
    x0, y0, x1, y1 = box
    terbaik = None
    for P in np.arange(6.6, 7.31, 0.02):
        for ox in np.arange(0, P, 1.0):
            for oy in np.arange(0, P, 1.0):
                xs = np.arange(x0 - ox, x1 + 1, P); ys = np.arange(y0 - oy, y1 + 1, P)
                if len(xs) < 3 or len(ys) < 3: continue
                err = 0
                for yy in ys[:-1]:
                    for xx in xs[:-1]:
                        c = a[int(yy + P * .25):int(yy + P * .75) + 1, int(xx + P * .25):int(xx + P * .75) + 1]
                        if c.size: err += c.std(axis=(0, 1)).sum()
                err /= (len(xs) * len(ys))
                if terbaik is None or err < terbaik[0]: terbaik = (err, P, ox, oy)
    return terbaik

for k, box in boxes.items():
    err, P, ox, oy = grid(box)
    x0, y0, x1, y1 = box
    xs = np.arange(x0 - ox, x1 + 1, P); ys = np.arange(y0 - oy, y1 + 1, P)
    h, w = len(ys) - 1, len(xs) - 1
    g = np.zeros((h, w, 3))
    for j in range(h):
        for i in range(w):
            c = a[int(ys[j] + P * .3):int(ys[j] + P * .7) + 1, int(xs[i] + P * .3):int(xs[i] + P * .7) + 1]
            g[j, i] = np.median(c.reshape(-1, 3), axis=0)
    putih = (g > 228).all(axis=2)
    # latar = sel putih yang tersambung ke tepi (flood fill); putih di dalam tetap putih
    luar = np.zeros_like(putih)
    tumpuk = [(j, i) for j in range(h) for i in (0, w - 1)] + [(j, i) for i in range(w) for j in (0, h - 1)]
    while tumpuk:
        j, i = tumpuk.pop()
        if 0 <= j < h and 0 <= i < w and putih[j, i] and not luar[j, i]:
            luar[j, i] = True
            tumpuk += [(j + 1, i), (j - 1, i), (j, i + 1), (j, i - 1)]
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., :3] = g.round().clip(0, 255)
    rgba[..., 3] = np.where(luar, 0, 255)
    # buang baris/kolom kosong di tepi
    isi = rgba[..., 3] > 0
    r = np.where(isi.any(1))[0]; c = np.where(isi.any(0))[0]
    rgba = rgba[r[0]:r[-1] + 1, c[0]:c[-1] + 1]
    Image.fromarray(rgba, 'RGBA').save(f'ref/{k}.png')
    print(k, 'P=%.2f' % P, 'grid', rgba.shape[1], 'x', rgba.shape[0], 'err %.1f' % err)
