# Membuat ikon pixel (SVG data URI) untuk Saling Bercerita.
# Setiap sprite adalah grid huruf; setiap huruf dipetakan ke warna. Titik = transparan.
import urllib.parse

def svg(grid, pal):
    h = len(grid); w = max(len(r) for r in grid)
    rects = []
    for y, row in enumerate(grid):
        x = 0
        while x < len(row):
            c = row[x]
            if c == '.' or c not in pal:
                x += 1; continue
            x2 = x
            while x2 + 1 < len(row) and row[x2 + 1] == c:
                x2 += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{x2 - x + 1}" height="1" fill="{pal[c]}"/>')
            x = x2 + 1
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" shape-rendering="crispEdges">' + ''.join(rects) + '</svg>'
    return 'url("data:image/svg+xml,' + urllib.parse.quote(s, safe='=/:"<> ') .replace('"', "'") + '")'

BINTANG = [
    ".....X.....",
    "....XYX....",
    "....XYX....",
    "XXXXYWYXXXX",
    "XYYYYWYYYYX",
    ".XYYYYYYYX.",
    "..XYYYYYX..",
    "..XYYYYYX..",
    ".XYYYXYYYX.",
    ".XYYX.XYYX.",
    ".XXX...XXX.",
]
HATI = [
    ".XXX.XXX.",
    "XWRRXRRRX",
    "XWRRRRRRX",
    "XRRRRRRRX",
    ".XRRRRRX.",
    "..XRRRX..",
    "...XRX...",
    "....X....",
]
AWAN = [
    "......XXXX..........",
    ".....XWWWWX..XXX....",
    "...XXWWWWWWXXWWWX...",
    "..XWWWWWWWWWWWWWWXX.",
    ".XWWWWWWWWWWWWWWWWWX",
    "XWWWWWWWWWWWWWWWBBWX",
    "XBBWWWWWWWWWWWBBBBBX",
    ".XXXXXXXXXXXXXXXXXX.",
]
MATAHARI = [
    "...XXXX...",
    ".XXYYYYXX.",
    ".XYWWYYYX.",
    "XYWYYYYYOX",
    "XYYYYYYYOX",
    "XYYYYYYYOX",
    "XYYYYYYOOX",
    ".XYYYYOOX.",
    ".XXOOOOXX.",
    "...XXXX...",
]
BUNGA = [
    "...XX.XX...",
    "..XPPXPPX..",
    ".XXPPXPPXX.",
    "XPPXXYXXPPX",
    "XPPPYYYPPPX",
    ".XXXXYXXXX.",
    "..XPPXPPX..",
    "...XX.XX...",
    ".....G.....",
    "..LL.G.....",
    ".LLLLG.LL..",
    "....LGLLLL.",
    ".....G.....",
]
GEMBOK = [
    "..XXXX..",
    ".X....X.",
    ".X....X.",
    "XXXXXXXX",
    "XYYYYYYX",
    "XYYXXYYX",
    "XYYXXYYX",
    "XYYYYYYX",
    "XXXXXXXX",
]

out = {
    "--px-bintang-nyala": svg(BINTANG, {"X": "#5b3a1e", "Y": "#f6c42a", "W": "#fff3b0"}),
    "--px-bintang-mati": svg(BINTANG, {"X": "#c4b398", "Y": "#efe4d0", "W": "#f7efe0"}),
    "--px-bintang-dadu": svg(BINTANG, {"X": "#4a2a14", "Y": "#fff3dc", "W": "#ffffff"}),
    "--px-hati-dadu": svg(HATI, {"X": "#22501f", "R": "#fff3dc", "W": "#ffffff"}),
    "--px-hati": svg(HATI, {"X": "#5b2030", "R": "#ef6f8a", "W": "#ffc4d1"}),
    "--px-awan": svg(AWAN, {"X": "#8cc3ea", "W": "#ffffff", "B": "#d4ecfb"}),
    "--px-matahari": svg(MATAHARI, {"X": "#e7a01a", "Y": "#ffd84a", "W": "#fff6b8", "O": "#f5b52e"}),
    "--px-bunga-pink": svg(BUNGA, {"X": "#8f2f45", "P": "#f7a9bb", "Y": "#ffd84a", "G": "#3f7a35", "L": "#6fb257"}),
    "--px-bunga-biru": svg(BUNGA, {"X": "#2a4f9c", "P": "#a9c6f5", "Y": "#ffd84a", "G": "#3f7a35", "L": "#6fb257"}),
    "--px-gembok": svg(GEMBOK, {"X": "#5b3a1e", "Y": "#f6c42a"}),
}
print(":root {")
for k, v in out.items():
    print(f"  {k}: {v};")
print("}")
