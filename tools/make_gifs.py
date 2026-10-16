"""Рисует анимированные гифки с Битом из тех же спрайтов, что и сайт.

Запуск: python3 tools/make_gifs.py  (нужен Pillow)
Спрайты берутся из assets/js/pixel.js, результат в assets/gif/*.gif.
"""
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "gif"
SCALE = 4
W = H = 32

PAL = {
    "k": "#14161c", "o": "#f2a65a", "d": "#c47a34", "w": "#fff4e0", "g": "#5cf29a",
    "p": "#ff8fa3", "c": "#6cc7ff", "y": "#ffe066", "r": "#ff6b6b", "s": "#3a4a42",
    "l": "#8a9a90", "G": "#2f7a50", "b": "#1d2a23", "m": "#e0a458",
}
KEYS = list(PAL)


def load_sprites():
    src = (ROOT / "assets" / "js" / "pixel.js").read_text(encoding="utf-8")
    sprites = {}
    for name, body in re.findall(r"(\w+): \{ mirror: true, rows: \[(.*?)\]\}", src, re.S):
        rows = re.findall(r'"([^"]+)"', body)
        sprites[name] = [r + r[::-1] for r in rows]
    return sprites


S = load_sprites()


def variant(base, edits):
    rows = [list(r) for r in S[base]]
    for (y, x), ch in edits.items():
        rows[y][x] = ch
        rows[y][15 - x] = ch
    return ["".join(r) for r in rows]


# Глаза закрыты (моргание)
BLINK = variant("bit", {(8, 2): "o", (8, 3): "o", (9, 2): "k", (9, 3): "k"})
# Глаза смотрят вверх
LOOKUP = variant("bit", {(8, 2): "g", (8, 3): "g", (9, 2): "o", (9, 3): "o"})
# Грустный: глаза-капли и рот вниз
SAD = variant("bit", {(8, 2): "o", (8, 3): "k", (9, 2): "k", (9, 3): "g", (11, 7): "k", (11, 6): "w"})

GLYPH = {
    "0": ["kkk", "k.k", "k.k", "k.k", "kkk"],
    "1": [".k.", "kk.", ".k.", ".k.", "kkk"],
    "?": ["kkk", "..k", ".kk", "...", ".k."],
    "!": [".k.", ".k.", ".k.", "...", ".k."],
}


class Canvas:
    def __init__(self):
        self.px = [[None] * W for _ in range(H)]

    def put(self, x, y, ch):
        if 0 <= x < W and 0 <= y < H and ch in PAL:
            self.px[y][x] = ch

    def sprite(self, rows, ox, oy):
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != ".":
                    self.put(ox + x, oy + y, ch)

    def glyph(self, g, ox, oy, color):
        for y, row in enumerate(GLYPH[g]):
            for x, ch in enumerate(row):
                if ch == "k":
                    self.put(ox + x, oy + y, color)

    def rect(self, x0, y0, w, h, ch):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                self.put(x, y, ch)

    def image(self):
        img = Image.new("P", (W, H), 0)
        flat = []
        for k in KEYS:
            v = PAL[k].lstrip("#")
            flat += [int(v[i:i + 2], 16) for i in (0, 2, 4)]
        # индекс 0 прозрачный, цвета начинаются с 1
        img.putpalette([0, 0, 0] + flat + [0, 0, 0] * (255 - len(KEYS)))
        for y in range(H):
            for x in range(W):
                ch = self.px[y][x]
                if ch:
                    img.putpixel((x, y), KEYS.index(ch) + 1)
        return img.resize((W * SCALE, H * SCALE), Image.NEAREST)


def body(c, ox, oy):
    """Маленькое тельце с лапками под головой."""
    c.rect(ox + 4, oy, 8, 4, "o")
    c.rect(ox + 3, oy, 1, 4, "k")
    c.rect(ox + 12, oy, 1, 4, "k")
    c.rect(ox + 6, oy, 4, 3, "w")
    c.rect(ox + 3, oy + 4, 10, 1, "k")
    c.rect(ox + 4, oy + 3, 2, 1, "d")
    c.rect(ox + 10, oy + 3, 2, 1, "d")


def bit_at(c, head, ox, oy):
    c.sprite(head, ox, oy)
    body(c, ox, oy + 14)


def save(name, frames, durations):
    imgs = [f.image() for f in frames]
    if isinstance(durations, int):
        durations = [durations] * len(imgs)
    imgs[0].save(OUT / f"{name}.gif", save_all=True, append_images=imgs[1:], duration=durations,
                 loop=0, transparency=0, disposal=2, optimize=False)


def wave():
    frames = []
    paw = [(-1, 0), (-2, -1), (-1, -2), (-2, -1)]
    for i in range(8):
        c = Canvas()
        bob = 1 if i % 4 in (1, 2) else 0
        head = BLINK if i == 6 else S["bitHappy"]
        bit_at(c, head, 8, 10 + bob)
        dx, dy = paw[i % 4]
        c.rect(24 + dx, 18 + dy + bob, 3, 3, "o")
        c.rect(24 + dx, 17 + dy + bob, 3, 1, "k")
        c.rect(27 + dx, 18 + dy + bob, 1, 3, "k")
        frames.append(c)
    save("wave", frames, 140)


def idle():
    frames = []
    seq = ["bit"] * 6 + ["blink"] + ["bit"] * 3 + ["blink", "bit"]
    for i, k in enumerate(seq):
        c = Canvas()
        bit_at(c, BLINK if k == "blink" else S["bit"], 8, 11 + (1 if i % 6 >= 3 else 0))
        frames.append(c)
    save("idle", frames, 160)


def party():
    import random
    rnd = random.Random(7)
    conf = [(rnd.randrange(0, 32), rnd.randrange(-32, 0), rnd.choice("gycrp")) for _ in range(26)]
    frames = []
    hops = [0, -2, -4, -5, -4, -2, 0, 0]
    for i in range(16):
        c = Canvas()
        for x, y, col in conf:
            yy = (y + i * 3) % 40 - 6
            c.put(x + (i // 3 % 2), yy, col)
        bit_at(c, S["bitHappy"], 8, 12 + hops[i % 8])
        if hops[i % 8] < -2:
            c.rect(5, 17 + hops[i % 8], 3, 2, "o")
            c.rect(24, 17 + hops[i % 8], 3, 2, "o")
        frames.append(c)
    save("party", frames, 90)


def sad():
    frames = []
    for i in range(10):
        c = Canvas()
        bit_at(c, SAD, 8, 12)
        ty = 21 + i
        if i < 8:
            c.put(10, ty, "c")
            c.put(10, ty + 1, "c")
        # тучка
        c.rect(9 + (i % 2), 2, 14, 3, "l")
        c.rect(11 + (i % 2), 1, 9, 1, "l")
        if i % 3 == 0:
            c.put(12, 6, "c")
            c.put(18, 7, "c")
        frames.append(c)
    save("sad", frames, 160)


def think():
    frames = []
    chars = ["0", "1", "?", "1", "0", "!"]
    for i in range(12):
        c = Canvas()
        bit_at(c, LOOKUP if i % 6 < 4 else S["bit"], 4, 12)
        # пузырь мысли
        c.put(21, 13, "w")
        c.rect(22, 10, 2, 2, "w")
        c.rect(23, 1, 9, 9, "w")
        c.rect(24, 0, 7, 1, "w")
        c.glyph(chars[i // 2], 26, 3, "k")
        frames.append(c)
    save("think", frames, 220)


def laptop():
    frames = []
    code = ["gG.gggG", "Gg.g", "gggG.g", ".gGg", "gg.Ggg", "Gg"]
    for i in range(8):
        c = Canvas()
        bit_at(c, BLINK if i == 5 else S["bit"], 8, 6 + (i % 2))
        # ноутбук
        c.rect(5, 19, 22, 11, "k")
        c.rect(6, 20, 20, 9, "b")
        for j in range(4):
            line = code[(i + j) % len(code)]
            for x, ch in enumerate(line):
                if ch != ".":
                    c.put(8 + x * 2, 21 + j * 2, ch)
                    c.put(9 + x * 2, 21 + j * 2, ch)
        c.rect(3, 30, 26, 2, "s")
        c.rect(2, 30, 1, 1, "k")
        frames.append(c)
    save("laptop", frames, 150)


def bits_float():
    frames = []
    spots = [(2, 0, "0"), (26, 6, "1"), (5, 14, "1"), (27, 20, "0"), (1, 26, "0")]
    for i in range(12):
        c = Canvas()
        for x, y, g in spots:
            yy = (y - i * 2) % 32
            c.glyph(g, x, yy, "g" if (i + x) % 3 else "G")
        bit_at(c, S["bit"] if i % 6 else BLINK, 8, 11)
        frames.append(c)
    save("bits", frames, 130)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for fn in (wave, idle, party, sad, think, laptop, bits_float):
        fn()
    for f in sorted(OUT.glob("*.gif")):
        print(f.name, f.stat().st_size)
