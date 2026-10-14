"""Generates the table QR codes used by the demo (no external libraries).
Run:  python make_qr.py   ->  writes qr-data.js
Each QR holds plain text such as  IRANI-CANTEEN:TABLE:5
"""
import json, os

# ---- Reed-Solomon over GF(256) ----
EXP, LOG = [0] * 512, [0] * 256
x = 1
for i in range(255):
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if x & 0x100:
        x ^= 0x11D
for i in range(255, 512):
    EXP[i] = EXP[i - 255]

def gmul(a, b):
    return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]

def rs_remainder(data, n):
    gen = [1]
    for i in range(n):
        nxt = [0] * (len(gen) + 1)
        for j, c in enumerate(gen):
            nxt[j] ^= c
            nxt[j + 1] ^= gmul(c, EXP[i])
        gen = nxt
    rem = [0] * n
    for b in data:
        f = b ^ rem[0]
        rem = rem[1:] + [0]
        for i in range(n):
            rem[i] ^= gmul(gen[i + 1], f)
    return rem

SIZE, DATA_CW, EC_CW = 25, 28, 16  # version 2, level M, single block

def build(text):
    data = text.encode()
    assert len(data) <= 26, 'text too long for v2-M'
    bits = []
    def put(v, n):
        bits.extend((v >> (n - 1 - i)) & 1 for i in range(n))
    put(0b0100, 4); put(len(data), 8)
    for b in data: put(b, 8)
    put(0, min(4, DATA_CW * 8 - len(bits)))
    while len(bits) % 8: bits.append(0)
    cw = [int(''.join(map(str, bits[i:i + 8])), 2) for i in range(0, len(bits), 8)]
    k = 0
    while len(cw) < DATA_CW:
        cw.append(0xEC if k % 2 == 0 else 0x11); k += 1
    cw += rs_remainder(cw, EC_CW)
    stream = [(c >> (7 - i)) & 1 for c in cw for i in range(8)]

    mod = [[False] * SIZE for _ in range(SIZE)]
    fn = [[False] * SIZE for _ in range(SIZE)]
    def setf(x, y, v):
        mod[y][x] = v; fn[y][x] = True
    for i in range(SIZE):
        setf(6, i, i % 2 == 0); setf(i, 6, i % 2 == 0)
    for cx, cy in ((3, 3), (SIZE - 4, 3), (3, SIZE - 4)):
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                xx, yy = cx + dx, cy + dy
                if 0 <= xx < SIZE and 0 <= yy < SIZE:
                    setf(xx, yy, max(abs(dx), abs(dy)) not in (2, 4))
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            setf(18 + dx, 18 + dy, max(abs(dx), abs(dy)) != 1)

    def draw_format(mask):
        d = mask  # ECC level M = 00
        rem = d
        for _ in range(10):
            rem = (rem << 1) ^ ((rem >> 9) * 0x537)
        fb = ((d << 10) | rem) ^ 0x5412
        g = lambda i: (fb >> i) & 1 == 1
        for i in range(0, 6): setf(8, i, g(i))
        setf(8, 7, g(6)); setf(8, 8, g(7)); setf(7, 8, g(8))
        for i in range(9, 15): setf(14 - i, 8, g(i))
        for i in range(0, 8): setf(SIZE - 1 - i, 8, g(i))
        for i in range(8, 15): setf(8, SIZE - 15 + i, g(i))
        setf(8, SIZE - 8, True)
    draw_format(0)

    i = 0
    for right in range(SIZE - 1, 0, -2):
        if right == 6: right = 5
        for vert in range(SIZE):
            for j in range(2):
                x = right - j
                up = ((right + 1) & 2) == 0
                y = SIZE - 1 - vert if up else vert
                if not fn[y][x] and i < len(stream):
                    mod[y][x] = stream[i] == 1; i += 1

    conds = [lambda x, y: (x + y) % 2 == 0, lambda x, y: y % 2 == 0, lambda x, y: x % 3 == 0,
             lambda x, y: (x + y) % 3 == 0, lambda x, y: (x // 3 + y // 2) % 2 == 0,
             lambda x, y: x * y % 2 + x * y % 3 == 0, lambda x, y: (x * y % 2 + x * y % 3) % 2 == 0,
             lambda x, y: ((x + y) % 2 + x * y % 3) % 2 == 0]

    def penalty(m):
        p = 0
        for grid in (m, [list(r) for r in zip(*m)]):
            for row in grid:
                run = 1
                for a in range(1, SIZE):
                    if row[a] == row[a - 1]:
                        run += 1
                        if run == 5: p += 3
                        elif run > 5: p += 1
                    else:
                        run = 1
                s = ''.join('1' if v else '0' for v in row)
                p += 40 * (s.count('10111010000') + s.count('00001011101'))
        for y in range(SIZE - 1):
            for x in range(SIZE - 1):
                if m[y][x] == m[y][x + 1] == m[y + 1][x] == m[y + 1][x + 1]: p += 3
        dark = sum(v for r in m for v in r)
        p += (abs(dark * 20 - SIZE * SIZE * 10) // (SIZE * SIZE) ) * 10
        return p

    best = None
    for mk in range(8):
        m2 = [r[:] for r in mod]
        for y in range(SIZE):
            for x in range(SIZE):
                if not fn[y][x] and conds[mk](x, y): m2[y][x] = not m2[y][x]
        # apply format for this mask
        mod_backup = mod
        globals_mod = m2
        # redraw format bits onto m2
        d = mk; rem = d
        for _ in range(10): rem = (rem << 1) ^ ((rem >> 9) * 0x537)
        fb = ((d << 10) | rem) ^ 0x5412
        g = lambda i: (fb >> i) & 1 == 1
        for i in range(0, 6): m2[i][8] = g(i)
        m2[7][8] = g(6); m2[8][8] = g(7); m2[8][7] = g(8)
        for i in range(9, 15): m2[8][14 - i] = g(i)
        for i in range(0, 8): m2[8][SIZE - 1 - i] = g(i)
        for i in range(8, 15): m2[SIZE - 15 + i][8] = g(i)
        m2[SIZE - 8][8] = True
        sc = penalty(m2)
        if best is None or sc < best[0]: best = (sc, m2)
    return best[1]

def to_svg(m, quiet=2):
    n = SIZE + quiet * 2
    d = ''.join(f'M{x + quiet} {y + quiet}h1v1h-1z' for y in range(SIZE) for x in range(SIZE) if m[y][x])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges">'
            f'<rect width="{n}" height="{n}" fill="#fff"/><path d="{d}" fill="#14110f"/></svg>')

if __name__ == '__main__':
    out = {}
    for t in range(1, 13):
        out[str(t)] = to_svg(build(f'IRANI-CANTEEN:TABLE:{t}'))
    out['takeaway'] = to_svg(build('IRANI-CANTEEN:TAKEAWAY'))
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, 'qr-data.js'), 'w') as f:
        f.write('/* Generated by tools/make_qr.py. Each QR encodes IRANI-CANTEEN:TABLE:<n> */\n')
        f.write('window.IC_QR = ' + json.dumps(out) + ';\n')
    print('QR codes written:', len(out))
