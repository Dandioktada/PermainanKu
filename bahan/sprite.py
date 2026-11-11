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
    s = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" shape-rendering="crispEdges">' + ''.join(rects) + '</svg>'
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

KUCING = [
    ".............X....X.",
    "............XOX..XOX",
    "............XOOXXOOX",
    "............XOOOOOOX",
    ".X..........XOXOOXOX",
    "XOX.........XOOPPOOX",
    "XOX..XXXXXXXXOOOOOOX",
    ".XOXXOOOOOOOOXXXXXX.",
    "..XOODOODOODOOOOOX..",
    "...XOOOOOOOOOOOOOX..",
    "...XOOXXXXXXXXOOX...",
    "...XXX........XXX...",
]
SAYAP = [
    "......XXX.",
    "....XXWWWX",
    "..XXWWWWBX",
    ".XWWWWWBX.",
    "XWWWWBBX..",
    "XBBBBXX...",
    ".XXXX.....",
]
KUPU = [
    "...X...X...",
    "....X.X....",
    ".XXX.X.XXX.",
    "XPPPXBXPPPX",
    "XPWPXBXPWPX",
    ".XPPXBXPPX.",
    "..XPXBXPX..",
    ".XPPXBXPPX.",
    ".XXX.X.XXX.",
]

KILAU = [
    "....X....",
    "...XYX...",
    "...XYX...",
    ".XXYWYXX.",
    "XYYWWWYYX",
    ".XXYWYXX.",
    "...XYX...",
    "...XYX...",
    "....X....",
]

CHAT = [
    "..XXXXXXXXXX..",
    ".XWWWWWWWWWWX.",
    "XWWWWWWWWWWWWX",
    "XWWDWWDWWDWWWX",
    "XWWWWWWWWWWWWX",
    "XWWWWWWWWWWWBX",
    ".XWWWWWWWWWBX.",
    "..XXWXXXXXXX..",
    "...XWX........",
    "...XX.........",
]
TELEPON = [
    "..XXX.........",
    ".XGGGX........",
    ".XGGGX........",
    ".XGGX.........",
    "..XGGX........",
    "...XGGX.......",
    "....XGGX..XXX.",
    ".....XGGXXGGGX",
    "......XGGGGGGX",
    ".......XXGGGX.",
    ".........XXX..",
]

# ---- Digambar ulang dari referensi pengguna ----
KUCING_HITAM = [
    ".....X....X...........",
    ".....XX..XX......XX...",
    ".....XPXXPX.....XBBX..",
    ".....XBBBBBX....XBBX..",
    ".....XBEBBEX.....XBX..",
    ".XXXXXBBNBBXX....XBX..",
    "XHBBBXBBBBBBBX...XBX..",
    "XBBBBBXXXBBBBBX..XBX..",
    ".XXXBBBBBBBBBBBXXBBX..",
    "..XBBBBBBBBBBBBBBBBX..",
    "...XXXXDBBBBBBBBBBX...",
    ".........XXDBBBBBBBX..",
    "...........XXDBBBBBX..",
    ".............XDBBBBX..",
    "..............XDBBBX..",
    ".............XDBXBBX..",
    "............XBBX.XBX..",
    "............XXX..XX...",
]
TELEPON_HIJAU = [
    "..XXXX.........",
    ".XGGGGX........",
    "XGDGDGDX.......",
    "XGGDGDGX.......",
    "XGDGDGDX.......",
    "XLGGGGX........",
    "XLLXXX.........",
    ".XLLX..........",
    ".XLLLX.........",
    "..XLLLX........",
    "...XLLLX..XXX..",
    "....XLLLXXGGGX.",
    ".....XLLLGDGDGX",
    "......XLLGGDGDX",
    ".......XLGDGDGX",
    "........XXGGGX.",
    "..........XXX..",
]
GELEMBUNG_IKON = [
    "...XXXXXXXXX...",
    "..XWWWWWWWWWX..",
    ".XWWWWWWWWWWWX.",
    "XWWWWWWWWWWWWWX",
    "XWWWWWWWWWWWWWX",
    "XWWWWWWWWWWWWWX",
    "XSWWWWWWWWWWWSX",
    ".XSSWWWWWWWSSX.",
    "..XXSXXXXXXXX..",
    "...XSX.........",
    "..XSX..........",
    "..XX...........",
]
# Gelembung pesan untuk 9-slice: potong atas 4, kanan 4, bawah 5, kiri 8 (ekor ada di potongan kiri bawah)
GELEMBUNG = [
    "...XXXXXXXXXXXXXXXXXX...",
    "..XWWWWWWWWWWWWWWWWWWX..",
    ".XWWWWWWWWWWWWWWWWWWWWX.",
    "XWWWWWWWWWWWWWWWWWWWWWWX",
    "XWWWWWWWWWWWWWWWWWWWWWWX",
    "XWWWWWWWWWWWWWWWWWWWWWWX",
    "XWWWWWWWWWWWWWWWWWWWWWWX",
    "XWWWWWWWWWWWWWWWWWWWWWWX",
    "XWWWWWWWWWWWWWWWWWWWWWWX",
    "XSWWWWWWWWWWWWWWWWWWWWSX",
    ".XSSSSSSSSSSSSSSSSSSSSX.",
    "..XXXSSSXXXXXXXXXXXXXX..",
    "....XSSX................",
    "....XSX.................",
    "....XX..................",
]
GELEMBUNG_KANAN = [baris[::-1] for baris in GELEMBUNG]

BULAN = [
    ".....XXXXX......",
    "...XXYYYYX......",
    "..XYWYYYX.......",
    ".XYWYYYX........",
    ".XYWYYX.........",
    "XYWYYYX.........",
    "XYWYYYX.........",
    "XYWYYYX.........",
    "XYYYYYYX........",
    ".XYYYYYYX.......",
    ".XYYYYYYYXX.....",
    "..XYYYYYYYYXXX..",
    "...XXYYYYYYYYYX.",
    ".....XXXXXXXXX..",
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
    "--px-kucing": svg(KUCING, {"X": "#3b2616", "O": "#f3b26b", "D": "#d9823b", "P": "#f08aa0"}),
    "--px-sayap": svg(SAYAP, {"X": "#5b7da3", "W": "#ffffff", "B": "#cfe6f7"}),
    "--px-kupu-pink": svg(KUPU, {"X": "#5b2030", "P": "#f59ab0", "W": "#fff1c2", "B": "#3b2616"}),
    "--px-kupu-biru": svg(KUPU, {"X": "#1f3f7a", "P": "#8fb8f2", "W": "#fff1c2", "B": "#3b2616"}),
    "--px-kilau": svg(KILAU, {"X": "#b8650f", "Y": "#ffd84a", "W": "#fffbe0"}),
    "--px-kilau-pink": svg(KILAU, {"X": "#a33a57", "Y": "#f7a9bb", "W": "#fff1f4"}),
    "--px-chat": svg(CHAT, {"X": "#3b2616", "W": "#ffffff", "D": "#a8683a", "B": "#d9e8f5"}),
    "--px-telepon": svg(TELEPON, {"X": "#3b2616", "G": "#5ea34c"}),
    "--px-kucing-hitam": svg(KUCING_HITAM, {"X": "#16151c", "B": "#3a3846", "D": "#2a2833", "H": "#5a5870", "E": "#f2a65a", "P": "#e8a0a8", "N": "#16151c"}),
    "--px-telepon-hijau": svg(TELEPON_HIJAU, {"X": "#1a4d10", "G": "#4c9a2a", "D": "#1e5c12", "L": "#79d13f"}),
    "--px-gelembung-ikon": svg(GELEMBUNG_IKON, {"X": "#1b1b22", "W": "#ffffff", "S": "#c9c6f2"}),
    "--px-gelembung": svg(GELEMBUNG, {"X": "#1b1b22", "W": "#ffffff", "S": "#c9c6f2"}),
    "--px-gelembung-kanan": svg(GELEMBUNG_KANAN, {"X": "#1b1b22", "W": "#f1fbe9", "S": "#bfe3b0"}),
    "--px-bulan": svg(BULAN, {"X": "#b9a96a", "Y": "#f6f0c8", "W": "#ffffff", "C": "#d8cf9e"}),
    "--px-gembok": svg(GEMBOK, {"X": "#5b3a1e", "Y": "#f6c42a"}),
}
print(":root {")
for k, v in out.items():
    print(f"  {k}: {v};")
print("}")
