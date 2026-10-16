"""Рисует анимированные гифки с Битом и его семьёй из тех же спрайтов, что и сайт.

Запуск: python3 tools/make_gifs.py  (нужен Pillow)
Спрайты и палитра берутся из assets/js/pixel.js, результат в assets/gif/*.gif.
Персонажи: холст 32x32, прозрачный фон. Мемы (meme-*.gif): холст 64x48 с фоном,
без текста; подписи к ним лежат в assets/gif/README.md. Всё увеличено в 4 раза
без сглаживания.
"""
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "gif"
SCALE = 4
W = H = 32

SRC = (ROOT / "assets" / "js" / "pixel.js").read_text(encoding="utf-8")

# Палитра сайта берётся из pixel.js, ниже только цвета, нужные гифкам
PAL = dict(re.findall(r'^\s*(\w): "(#[0-9a-fA-F]{6})"', SRC.split("const SPRITES")[0], re.M))
PAL.update({
    "l": "#8a9a90", "G": "#2f7a50", "b": "#1d2a23", "M": "#e0a458",
    "B": "#2a3b32",  # линии и пол
    "R": "#b8323f",  # тёмно-красный (перегрев)
    "F": "#ff9b3d",  # огонь
    "u": "#3d6fd6",  # синий (экран обновления, дискета)
    "U": "#1f3266",  # тёмно-синий (ночь)
    "h": "#0f1714",  # тёмный экран
    "t": "#7a4a2a",  # стол
    "T": "#4e2f1a",  # тень стола
})
KEYS = list(PAL)


def load_sprites():
    sprites = {}
    for name, mirror, body in re.findall(r"(\w+): \{ mirror: (true|false), rows: \[(.*?)\]\}", SRC, re.S):
        rows = re.findall(r'"([^"]+)"', body)
        sprites[name] = [r + r[::-1] for r in rows] if mirror == "true" else rows
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
    "2": ["kkk", "..k", "kkk", "k..", "kkk"],
    "3": ["kkk", "..k", ".kk", "..k", "kkk"],
    "4": ["k.k", "k.k", "kkk", "..k", "..k"],
    "5": ["kkk", "k..", "kkk", "..k", "kkk"],
    "6": ["kkk", "k..", "kkk", "k.k", "kkk"],
    "7": ["kkk", "..k", ".k.", ".k.", ".k."],
    "8": ["kkk", "k.k", "kkk", "k.k", "kkk"],
    "9": ["kkk", "k.k", "kkk", "..k", "kkk"],
    "?": ["kkk", "..k", ".kk", "...", ".k."],
    "!": [".k.", ".k.", ".k.", "...", ".k."],
    "%": ["k.k", "..k", ".k.", "k..", "k.k"],
    "/": ["..k", "..k", ".k.", "k..", "k.."],
    ".": ["...", "...", "...", "...", ".k."],
    "÷": [".k.", "...", "kkk", "...", ".k."],
    "=": ["...", "kkk", "...", "kkk", "..."],
    "Z": ["kkk", "..k", ".k.", "k..", "kkk"],
    " ": ["...", "...", "...", "...", "..."],
}


class Canvas:
    def __init__(self, w=W, h=H, bg=None):
        self.w, self.h = w, h
        self.px = [[bg] * w for _ in range(h)]

    def put(self, x, y, ch):
        if 0 <= x < self.w and 0 <= y < self.h and ch in PAL:
            self.px[y][x] = ch

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.px[y][x]
        return None

    def sprite(self, rows, ox, oy, flip=False):
        for y, row in enumerate(rows):
            if flip:
                row = row[::-1]
            for x, ch in enumerate(row):
                if ch != ".":
                    self.put(ox + x, oy + y, ch)

    def glyph(self, g, ox, oy, color, scale=1):
        for y, row in enumerate(GLYPH[g]):
            for x, ch in enumerate(row):
                if ch == "k":
                    self.rect(ox + x * scale, oy + y * scale, scale, scale, color)

    def text(self, s, ox, oy, color, scale=1):
        """Цифры и значки шрифтом 3x5, между знаками 1 пиксель."""
        for i, g in enumerate(s):
            self.glyph(g, ox + i * 4 * scale, oy, color, scale)

    def rect(self, x0, y0, w, h, ch):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                self.put(x, y, ch)

    def box(self, x0, y0, w, h, fill, edge="k"):
        """Прямоугольник с рамкой в 1 пиксель."""
        self.rect(x0, y0, w, h, edge)
        if w > 2 and h > 2:
            self.rect(x0 + 1, y0 + 1, w - 2, h - 2, fill)

    def line(self, x0, y0, x1, y1, ch):
        n = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(n + 1):
            self.put(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), ch)

    def image(self):
        img = Image.new("P", (self.w, self.h), 0)
        flat = []
        for k in KEYS:
            v = PAL[k].lstrip("#")
            flat += [int(v[i:i + 2], 16) for i in (0, 2, 4)]
        # индекс 0 прозрачный, цвета начинаются с 1
        img.putpalette([0, 0, 0] + flat + [0, 0, 0] * (255 - len(KEYS)))
        img.putdata([KEYS.index(ch) + 1 if ch else 0 for row in self.px for ch in row])
        return img.resize((self.w * SCALE, self.h * SCALE), Image.NEAREST)


def body(c, ox, oy, fur="o", shade="d", belly="w"):
    """Маленькое тельце с лапками под головой."""
    c.rect(ox + 4, oy, 8, 4, fur)
    c.rect(ox + 3, oy, 1, 4, "k")
    c.rect(ox + 12, oy, 1, 4, "k")
    c.rect(ox + 6, oy, 4, 3, belly)
    c.rect(ox + 3, oy + 4, 10, 1, "k")
    c.rect(ox + 4, oy + 3, 2, 1, shade)
    c.rect(ox + 10, oy + 3, 2, 1, shade)


def bit_at(c, head, ox, oy):
    c.sprite(head, ox, oy)
    body(c, ox, oy + 14)


def save(name, frames, durations, backdrop=False):
    """backdrop=True: у мема нарисован фон, прозрачность не нужна,
    и кадры можно хранить разницей с предыдущим (файл меньше)."""
    imgs = [f.image() for f in frames]
    if isinstance(durations, int):
        durations = [durations] * len(imgs)
    if backdrop:
        imgs[0].save(OUT / f"{name}.gif", save_all=True, append_images=imgs[1:], duration=durations,
                     loop=0, disposal=1, optimize=False)
    else:
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


# ---------------------------------------------------------------------------
# Эмоции Бита и его семья. Холст 32x32, прозрачный фон.
# ---------------------------------------------------------------------------

def recolor(rows, mapping):
    return ["".join(mapping.get(ch, ch) for ch in r) for r in rows]


def shifted(rows, dx):
    """Сдвиг строк спрайта вправо (dx>0) или влево с обрезкой до 16 пикселей."""
    if dx > 0:
        return ["." * dx + r[:-dx] for r in rows]
    if dx < 0:
        return [r[-dx:] + "." * -dx for r in rows]
    return rows


NOTE = ["..kk", "..k.", "..k.", "kkk.", "kk.."]
HEART = ["rr.rr", "rrrrr", ".rrr.", "..r.."]
VEIN = ["rr.rr", "r...r", ".....", "r...r", "rr.rr"]
STAR = [".k.", "kkk", ".k."]
PAW = [".kkkkkk.", "kokokook", "kokokook", "kooooook", "kdddddok", ".kkkkkk."]
FISH = [
    "..ccc...cc",
    ".cccccc.c.",
    "cwkccccccc",
    ".cccccc.c.",
    "..ccc...cc",
]
FISHBONE = ["l.l.l.ll", "lllllll.", "l.l.l.ll"]
FLOPPY = [
    "kkkkkkkkk",
    "kuslllsuk",
    "kuslkls.k",
    "kuslllsuk",
    "kuuuuuuuk",
    "kuwwwwwuk",
    "kuwkkkwuk",
    "kuwwwwwuk",
    "kkkkkkkkk",
]

# Бит с открытым ртом (ест)
BIT_OPEN = variant("bitHappy", {(12, 6): "k", (12, 7): "r", (11, 7): "p"})
# Бит косит глазами к носу
BIT_CROSS = variant("bit", {(8, 3): "k", (9, 3): "k", (8, 2): "w", (9, 2): "w"})
# Бит в красном: перегрелся
HOT = {"o": "r", "d": "R"}
# Нибл моргает
NIB_BLINK = [list(r) for r in S["nibble"]]
for _x in (3, 4, 11, 12):
    NIB_BLINK[8][_x] = "n"
    NIB_BLINK[9][_x] = "k"
NIB_BLINK = ["".join(r) for r in NIB_BLINK]
# Мега моргает и Мега говорит (рот в бороде)
MEGA_BLINK = variant("mega", {(9, 3): "e", (9, 4): "e", (10, 3): "k", (10, 4): "k"})
MEGA_TALK = variant("mega", {(14, 4): "k", (14, 5): "k", (14, 6): "r", (14, 7): "r", (15, 4): "w", (15, 5): "k", (15, 6): "k", (15, 7): "k"})


def stamp(c, rows, ox, oy, color):
    """Нарисовать маску из строк, где 'k' значит пиксель цветом color."""
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                c.put(ox + x, oy + y, color if ch == "k" else ch)


def nib_body(c, ox, oy):
    """Тельце Нибл: меньше, чем у Бита."""
    c.rect(ox + 5, oy, 6, 3, "n")
    c.rect(ox + 4, oy, 1, 3, "k")
    c.rect(ox + 11, oy, 1, 3, "k")
    c.rect(ox + 7, oy, 2, 2, "w")
    c.rect(ox + 4, oy + 3, 8, 1, "k")
    c.rect(ox + 5, oy + 2, 1, 1, "N")
    c.rect(ox + 10, oy + 2, 1, 1, "N")


def nib_at(c, head, ox, oy):
    c.sprite(head, ox, oy)
    nib_body(c, ox, oy + 14)


def mega_at(c, head, ox, oy):
    body(c, ox, oy + 14, "e", "E", "w")
    c.sprite(head, ox, oy)


PUFFS = {
    3: [".k.", "kkk", ".k."],
    4: [".kk.", "kkkk", ".kk."],
    5: [".kkk.", "kkkkk", "kkkkk", ".kkk."],
}


def puff(c, x, y, size, col="l"):
    """Облачко пара или дыма, size от 1 до 5."""
    if size <= 1:
        c.put(x, y, col)
    elif size == 2:
        c.rect(x, y, 2, 2, col)
    else:
        stamp(c, PUFFS[min(size, 5)], x, y, col)


def halo(c, pixels, col="l"):
    """Светлая обводка вокруг тёмных пикселей, чтобы их было видно на тёмной странице."""
    own = {(x, y) for x, y, _ in pixels}
    for x, y, _ in pixels:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in own and c.get(x + dx, y + dy) is None:
                c.put(x + dx, y + dy, col)
    for x, y, ch in pixels:
        c.put(x, y, ch)


def bit_sleep():
    frames = []
    for i in range(14):
        c = Canvas()
        breath = 1 if i % 7 >= 4 else 0
        bit_at(c, S["bitSleep"], 6, 13 + breath)
        # пузырь из носа надувается и лопается
        r = [0, 1, 1, 2, 2, 3, 3, 4, 4, 0, 0, 0, 0, 0][i]
        nx, ny = 15, 25 + breath
        if r == 1:
            c.put(nx, ny, "c")
        elif r >= 2:
            c.rect(nx, ny - r + 1, r, r, "c")
            c.put(nx, ny - r + 1, "w")
        if i == 9:
            for dx, dy in ((-1, -2), (3, -2), (-1, 1), (3, 1)):
                c.put(nx + dx, ny + dy, "w")
        # Zzz улетают вверх
        for k in range(3):
            t = (i + k * 5) % 14
            if t < 11:
                x, y = 20 + t // 2, 11 - t
                c.glyph("Z", x, y, "w" if t < 7 else "l")
        frames.append(c)
    save("bit-sleep", frames, 170)


def bit_dance():
    frames = []
    dxs = [0, 1, 2, 1, 0, -1, -2, -1]
    for i in range(16):
        c = Canvas()
        j = i % 8
        dx, dy = dxs[j], -1 if j % 2 else 0
        head = BLINK if i == 13 else S["bitHappy"]
        ox, oy = 8 + dx, 11 + dy
        # лапки вверх по очереди
        side = 0 if j < 4 else 1
        px = ox - 2 if side == 0 else ox + 15
        c.rect(px, oy + 5, 3, 3, "o")
        c.rect(px, oy + 4, 3, 1, "k")
        c.put(px + (0 if side == 0 else 2), oy + 8, "k")
        bit_at(c, head, ox, oy)
        # ноты летают
        for k, col in ((0, "y"), (1, "c")):
            t = (i + k * 8) % 16
            x = 1 + k * 25 + (t // 4) % 2
            y = 14 - t // 2
            if t < 14:
                stamp(c, NOTE, x, y, col)
        c.rect(9, 30, 14, 1, "s")
        frames.append(c)
    save("bit-dance", frames, 110)


def bit_cool():
    base, cool = S["bit"], S["bitCool"]
    glasses = [(y, x, cool[y][x]) for y in range(8, 11) for x in range(16)
               if cool[y][x] != base[y][x]]
    frames, durs = [], []
    ox, oy = 8, 11
    for i in range(20):
        c = Canvas()
        if i < 12:
            bit_at(c, BLINK if i == 2 else base, ox, oy)
            if i >= 4:
                drop = min(i - 4, 7)  # очки спускаются сверху
                dy = oy - 12 + drop * 12 // 7
                halo(c, [(ox + x, dy + y, ch) for y, x, ch in glasses], "s")
            durs.append(110 if i >= 4 else 200)
        else:
            nod = 1 if i in (13, 15) else 0
            bit_at(c, cool, ox, oy + nod)
            # блик бежит по очкам
            gx = [2, 4, 6, 9, 11, 13, 20, 20][i - 12]
            if gx < 16:
                c.put(ox + gx, oy + 9 + nod, "w")
                c.put(ox + gx, oy + 8 + nod, "w")
            if i in (16, 17):
                stamp(c, STAR, ox + 14, oy + 5, "y")
            durs.append(160)
        frames.append(c)
    save("bit-cool", frames, durs)


def bit_angry():
    frames = []
    shake = [0, 1, -1, 1, 0, -1, 1, 0, -1, 1]
    for i in range(10):
        c = Canvas()
        ox, oy = 8 + shake[i], 12
        bit_at(c, S["bitAngry"], ox, oy)
        # пар из ушей вырывается клубами
        for k in range(2):
            t = (i + k * 5) % 10
            if t < 7:
                size = [2, 3, 4, 5, 5, 4, 3][t]
                col = "w" if t < 4 else "l"
                puff(c, ox - 1 - t, oy + 1 - t, size, col)
                puff(c, ox + 15 + t - size + 2, oy + 1 - t, size, col)
        if i % 4 < 2:
            stamp(c, VEIN, ox + 11, oy + 5, "r")
        frames.append(c)
    save("bit-angry", frames, 90)


def bit_facepalm():
    frames, durs = [], []
    for i in range(16):
        c = Canvas()
        ox, oy = 8, 11
        if i < 3:
            bit_at(c, S["bit"], ox, oy)
            durs.append(220)
            frames.append(c)
            continue
        sink = 1 if i >= 6 else 0
        sway = [0, 0, 1, 1, 0, 0, -1, -1][i % 8] if i >= 8 else 0
        bit_at(c, BLINK if i >= 5 else S["bitShock"], ox + sway, oy + sink)
        # лапа поднимается от тельца и закрывает один глаз и лоб
        py = oy + [0, 0, 0, 13, 9, 5, 5][min(i, 6)] + sink
        px = ox + 6 + sway
        bottom = oy + 15 + sink
        if bottom > py + 5:
            c.rect(px + 3, py + 5, 3, bottom - py - 5, "o")  # рука до тельца
            c.rect(px + 2, py + 5, 1, bottom - py - 5, "k")
            c.rect(px + 6, py + 5, 1, bottom - py - 5, "k")
            c.rect(px + 5, py + 5, 1, bottom - py - 5, "d")
        c.sprite(PAW, px, py)
        # вздох
        if i in (11, 12, 13):
            puff(c, ox + 15 + sway + (i - 11), oy + 11 - (i - 11), 2 + (i - 11) // 2, "w" if i < 13 else "l")
        durs.append(140 if i < 7 else 180)
        frames.append(c)
    save("bit-facepalm", frames, durs)


def bit_run():
    frames = []
    bob = [0, -1, -2, -1]
    for i in range(8):
        c = Canvas()
        ox, oy = 11, 10 + bob[i % 4]
        # ноги мелькают
        ly = oy + 18
        if i % 2 == 0:
            c.rect(ox + 3, ly, 2, 2, "o"); c.put(ox + 2, ly + 1, "k")
            c.rect(ox + 11, ly, 2, 2, "o"); c.put(ox + 13, ly + 1, "k")
        else:
            c.rect(ox + 6, ly, 2, 2, "o"); c.rect(ox + 8, ly, 2, 2, "d")
            c.rect(ox + 6, ly + 2, 4, 1, "k")
        bit_at(c, S["bit"] if i % 4 else S["bitShock"], ox, oy)
        # хвост назад
        c.rect(ox - 3, oy + 15 + (i % 2), 4, 1, "o")
        c.put(ox - 4, oy + 14 + (i % 2), "o")
        # линии скорости и пыль
        for k, y in enumerate((9, 17, 24)):
            x = (k * 7 - i * 4) % 14
            c.rect(x - 2, y, 6 - k, 1, "l")
        t = i % 4
        puff(c, ox - 2 - t * 2, 28 - t // 2, 3 - t // 2 if t < 3 else 1, "l")
        # капля пота
        if i % 4 in (1, 2):
            c.put(ox - 1 - (i % 4), oy + 3, "c")
        frames.append(c)
    save("bit-run", frames, 75)


def bit_overheat():
    frames = []
    for i in range(18):
        c = Canvas()
        heat = min(i / 11, 1)
        shake = [0, 1, 0, -1][i % 4] if i >= 12 else 0
        ox, oy = 4 + shake, 13
        if i < 6:
            head = S["bit"]
        elif i < 9:
            head = recolor(S["bit"], {"d": "R"})
        elif i < 12:
            head = recolor(S["bit"], HOT)
        else:
            head = recolor(S["bitShock"], HOT)
        c.sprite(head, ox, oy)
        body(c, ox, oy + 14, "r" if i >= 9 else "o", "R" if i >= 6 else "d")
        # градусник
        tx, ty = 24, 4
        c.box(tx, ty, 5, 20, "w")
        c.box(tx - 1, ty + 19, 7, 6, "r")
        c.rect(tx + 1, ty + 20, 4, 4, "r")
        lvl = int(2 + heat * 16)
        c.rect(tx + 1, ty + 19 - lvl, 3, lvl + 1, "r")
        if i >= 12 and i % 2:
            c.rect(tx + 1, ty + 1, 3, 2, "y")
        # пот и дым
        if 6 <= i < 12:
            c.put(ox + 1 - (i % 2), oy + 5 + (i % 3), "c")
            c.put(ox + 15 + (i % 2), oy + 6 + (i % 3), "c")
        if i >= 10:
            for k in range(3):
                t = (i + k * 3) % 9
                puff(c, ox + 4 + k * 3 + (t // 3) * (1 if k else -1), oy - 2 - t, 2 + t // 3, "l" if t < 5 else "s")
        frames.append(c)
    save("bit-overheat", frames, [160] * 6 + [130] * 6 + [100] * 6)


def bit_eat():
    frames, durs = [], []
    ox, oy = 4, 12
    for i in range(16):
        c = Canvas()
        fx = [30, 26, 22, 18, 13, 13, 13, 13, 13, 13][i] if i < 10 else None
        if i < 4:
            head = S["bit"] if i < 3 else BIT_OPEN
        elif i in (4, 6, 8):
            head = BIT_OPEN
        elif i < 10:
            head = S["bitHappy"]
        else:
            head = BLINK if i in (11, 13) else S["bitHappy"]
        bit_at(c, head, ox, oy + (1 if i >= 10 and i % 2 else 0))
        # рыбка подплывает и укорачивается с каждым укусом
        bitten = {5: 3, 6: 3, 7: 6, 8: 6, 9: 10}.get(i, 0)
        if fx is not None and bitten < 10:
            rows = [r[bitten:] for r in FISH]
            c.sprite(rows, fx + bitten, oy + 9 + (i % 2 if i < 4 else 0))
        if i in (5, 7, 9):
            for dx, dy in ((0, -2), (4, -3), (2, 4), (6, 3)):
                c.put(ox + 16 + dx, oy + 10 + dy, "c")
        if i >= 9:
            c.sprite(FISHBONE, 23, 27)
        if i >= 11:
            stamp(c, HEART, 24, 4 - (i - 11) // 2, "r")
        durs.append(140)
        frames.append(c)
    save("bit-eat", frames, durs)


def nibble_idle():
    frames = []
    for i in range(12):
        c = Canvas()
        bob = 1 if i % 6 >= 3 else 0
        head = NIB_BLINK if i in (4, 10) else S["nibble"]
        nib_at(c, head, 8, 12 + bob)
        if i % 4 == 2:  # бантик шевелится
            c.rect(8 + 11, 12 + bob + 2, 1, 1, "r")
        frames.append(c)
    save("nibble-idle", frames, 170)


def nibble_tease():
    frames, durs = [], []
    hops = [0, -3, -5, -6, -5, -3, 0, 0, -3, -5, -6, -5, -3, 0]
    for i in range(len(hops)):
        c = Canvas()
        dy = hops[i]
        nib_at(c, S["nibbleHappy"] if dy else S["nibble"], 8, 13 + dy)
        if dy < -4:
            c.rect(9, 18 + dy, 2, 2, "n")
            c.rect(21, 18 + dy, 2, 2, "n")
        if dy == 0:
            c.rect(10, 31, 12, 1, "s")
        durs.append(80)
        frames.append(c)
    # дразнится: язык, лапка у щеки, качается
    for i in range(10):
        c = Canvas()
        dx = [0, 1, 0, -1][i % 4]
        nib_at(c, S["nibbleHappy"], 8 + dx, 13)
        side = 6 + dx if i % 8 < 4 else 23 + dx
        c.box(side, 21, 3, 3, "n")
        c.put(side + 1, 20, "k")
        if i % 2:
            stamp(c, STAR, 2 + (i % 4) * 7, 4 + (i % 3) * 2, "m")
        durs.append(130)
        frames.append(c)
    save("nibble-tease", frames, durs)


def mega_idle():
    frames = []
    for i in range(12):
        c = Canvas()
        bob = 1 if i % 6 >= 3 else 0
        # трость
        c.rect(25, 10, 1, 21, "M")
        c.rect(22, 9, 4, 1, "M")
        c.put(22, 10, "M")
        mega_at(c, MEGA_BLINK if i == 7 else S["mega"], 6, 8 + bob)
        c.rect(23, 18 + bob, 3, 2, "e")  # лапа на трости
        c.rect(23, 17 + bob, 3, 1, "k")
        frames.append(c)
    save("mega-idle", frames, 200)


def mega_story():
    frames, durs = [], []
    for i in range(18):
        c = Canvas()
        talk = i < 12 and i % 2 == 1
        if i >= 12:
            head = S["megaHappy"]
        else:
            head = MEGA_TALK if talk else S["mega"]
        mega_at(c, head, 1, 11)
        # дискета в лапе, к середине рассказа поднимается
        fy = [22, 22, 22, 22, 22, 22, 19, 16, 13, 11, 11, 11][min(i, 11)]
        c.rect(17, fy + 8, 3, 4, "e")
        c.sprite(FLOPPY, 18, fy)
        if 8 <= i <= 11:
            stamp(c, STAR, 27, fy - 1 + (i % 2), "y")
            c.put(17, fy - 1 - (i % 2), "y")
        # пузырь: «1.44»
        if i >= 10:
            c.box(13, 0, 19, 9, "w", "w")
            c.text("1.44", 16, 2, "k")
            c.put(15, 9, "w")
            c.put(14, 10, "w")
        durs.append(170 if i < 12 else 260)
        frames.append(c)
    save("mega-story", frames, durs)


def glitch_idle():
    frames = []
    for i in range(12):
        c = Canvas()
        bob = [0, 0, -1, -1, -2, -2, -1, -1][i % 8]
        rows = list(S["glitch"])
        if i % 2:  # лапки шевелятся
            rows[13] = ".k.k.k....k.k.k."
        if i in (5, 6):  # усики
            rows[0] = ".r...........r.."
        if i == 9:  # короткий сбой: полоса сдвинута
            rows[5:8] = shifted(rows[5:8], 2)
        c.sprite(rows, 8, 10 + bob)
        c.rect(11, 29, 10, 1, "s")
        frames.append(c)
    save("glitch-idle", frames, 120)


def glitch_glitch():
    import random
    rnd = random.Random(11)
    frames = []
    for i in range(14):
        c = Canvas()
        split = [0, 1, 2, 3, 1, 0, 2, 4, 0, 1, 3, 0, 2, 1][i]
        rows = list(S["glitch"])
        if split:
            gone = i in (7, 11)
            for col, dx, dy in (("r", -split, -1), ("c", split, 1)):
                mask = recolor(rows, {ch: col for ch in PAL})
                if gone:  # только полосы развёртки
                    mask = [r if y % 2 == 0 else "." * 16 for y, r in enumerate(mask)]
                c.sprite(mask, 8 + dx, 10 + dy)
        if i not in (7, 11):  # в эти кадры исчезает, остаётся только тень RGB
            band = rnd.randrange(3, 11)
            rows[band:band + 3] = shifted(rows[band:band + 3], rnd.choice((-3, -2, 2, 3)))
            c.sprite(rows, 8, 10)
        for _ in range(6):
            x, y = rnd.randrange(32), rnd.randrange(32)
            c.rect(x, y, rnd.randrange(1, 4), 1, rnd.choice("mgcr"))
        if i % 3 == 0:
            c.text("01", rnd.randrange(0, 24), rnd.randrange(0, 4), "g")
        frames.append(c)
    save("glitch-glitch", frames, [90, 70, 60, 120, 80, 200, 60, 60, 160, 70, 60, 120, 90, 80])


def glitch_laugh():
    import random
    rnd = random.Random(5)
    frames = []
    bits = []
    for i in range(14):
        c = Canvas()
        dy = [0, -1, 0, -1][i % 4]
        dx = [0, 1, 0, -1][i % 4] if i % 7 < 5 else 0
        c.sprite(S["glitchLaugh"] if i % 7 < 5 else S["glitch"], 8 + dx, 12 + dy)
        # из пасти вылетают перепутанные биты
        if i % 2 == 0:
            side = rnd.choice((-1, 1))
            bits.append([14 + side * 7, 22, side, rnd.choice("01"), rnd.choice("gcym")])
        for b in bits:
            b[0] += b[2]
            b[1] -= 2
        bits = [b for b in bits if b[1] > -5 and -3 < b[0] < 32]
        for x, y, _, g, col in bits:
            c.glyph(g, x, y, col)
        frames.append(c)
    save("glitch-laugh", frames, 100)


def glitch_hurt():
    frames = []
    ring = [(0, -6), (5, -4), (7, 0), (5, 4), (0, 6), (-5, 4), (-7, 0), (-5, -4)]
    for i in range(8):
        c = Canvas()
        dx = [0, -1, 0, 1][i % 4]
        c.sprite(S["glitchHurt"], 8 + dx, 14)
        for k in range(3):
            x, y = ring[(i + k * 3) % 8]
            stamp(c, STAR, 15 + x, 9 + y // 2, "y")
        frames.append(c)
    save("glitch-hurt", frames, 120)


CHARACTER_GIFS = (bit_sleep, bit_dance, bit_cool, bit_angry, bit_facepalm, bit_run, bit_overheat,
                  bit_eat, nibble_idle, nibble_tease, mega_idle, mega_story,
                  glitch_idle, glitch_glitch, glitch_laugh, glitch_hurt)


# ---------------------------------------------------------------------------
# Анимированные мемы: холст 64x48 с нарисованным фоном, без текста
# (подписи сверху и снизу делает HTML, см. assets/gif/README.md).
# ---------------------------------------------------------------------------
MW, MH = 64, 48
SHIELD = ["kkkkk", "kkwkk", "kwwwk", ".kwk.", ".kkk.", "..k.."]
SPIN = [(0, -3), (2, -2), (3, 0), (2, 2), (0, 3), (-2, 2), (-3, 0), (-2, -2)]


def meme_canvas(floor_y, floor="B"):
    c = Canvas(MW, MH, "b")
    c.rect(0, floor_y, MW, MH - floor_y, floor)
    return c


def desk(c, y, x0=0, x1=MW):
    c.rect(x0, y, x1 - x0, 2, "t")
    c.rect(x0, y + 2, x1 - x0, 1, "T")


def spinner(c, cx, cy, step, head="w", tail="l", rest="B"):
    for k, (dx, dy) in enumerate(SPIN):
        d = (step - k) % 8
        c.put(cx + dx, cy + dy, head if d == 0 else tail if d < 3 else rest)


def sparkle(c, x, y, phase, col="y"):
    if phase % 2:
        stamp(c, STAR, x, y, col)
    else:
        c.put(x + 1, y + 1, col)


def meme_10_types():
    """Урок 2. «Существует 10 типов людей»: одни смеются, другие ищут подвох."""
    frames, durs = [], []
    for i in range(20):
        c = meme_canvas(41)
        c.rect(0, 41, MW, 1, "s")
        # табло с «10»
        c.rect(26, 15, 1, 6, "s")
        c.rect(37, 15, 1, 6, "s")
        c.box(21, 1, 22, 14, "h", "M")
        c.text("10", 25, 3, "G" if i < 4 and i % 2 else "g", scale=2)
        laugh = 4 <= i
        dy = -1 if laugh and i % 2 else 0
        # левые: понимают двоичный код
        bit_at(c, S["bitHappy"] if laugh else LOOKUP, 1, 22 + dy)
        nib_at(c, S["nibbleHappy"] if laugh else S["nibble"], 16, 24 - (1 if laugh and i % 2 == 0 else 0))
        # правые: не понимают
        mega_at(c, S["mega"], 33, 22)
        if i < 12:
            right = S["bit"]
        elif i < 15:
            right = S["bitShock"]
        else:
            right = S["bitHappy"]
        rdy = -1 if i >= 15 and i % 2 else 0
        bit_at(c, right, 48, 22 + rdy)
        if laugh:
            for x in (0, 14, 30):
                c.put(x + (i % 2), 19 - (i % 2), "y")
                c.put(x + 1 - (i % 2), 18, "y")
        if 4 <= i < 12:
            c.glyph("?", 45, 15 + (i % 2), "w")
            c.glyph("?", 55, 15 + ((i + 1) % 2), "w")
        if 12 <= i < 15:
            c.glyph("?", 45, 15, "w")
            c.glyph("!", 55, 14, "y")
        if i >= 15:
            for k in range(3):
                c.glyph("?", 42 + k * 4, 13 + (i + k) % 2, "w")
        frames.append(c)
        durs.append(250 if i < 4 else 140 if i < 12 else 220 if i < 15 else 170)
    durs[-1] = 900
    save("meme-10-types", frames, durs, backdrop=True)


def meme_nibble_1023():
    """Урок 2. Нибл считает на 10 пальцах в двоичном коде и переполняется на 1024."""
    seq = [0, 1, 2, 3, 4, 5, 6, 7, 15, 31, 63, 127, 255, 511, 1023, 1023, "boom", "boom", "boom", 0, 0]
    durs = [380, 260, 260, 260, 260, 260, 260, 260, 160, 140, 130, 120, 110, 100, 500, 400, 90, 90, 90, 600, 900]
    frames = []
    for i, v in enumerate(seq):
        c = meme_canvas(45)
        c.rect(0, 45, MW, 1, "s")
        boom = v == "boom"
        # 10 лампочек = 10 «пальцев»
        for j in range(10):
            on = (not boom) and isinstance(v, int) and v >> (9 - j) & 1
            x = 3 + j * 6
            c.rect(x + 1, 8, 1, 3, "s")
            if boom:
                c.box(x, 3, 4, 5, "r" if i % 2 else "y", "R")
            elif on:
                c.box(x, 3, 4, 5, "g", "G")
                c.put(x + 1, 4, "w")
            else:
                c.box(x, 3, 4, 5, "h", "B")
        # табло
        c.box(14, 11, 36, 14, "h", "M")
        if boom:
            c.text("!!!", 21, 13, "r" if i % 2 else "y", scale=2)
        else:
            s = str(v)
            c.text(s, 48 - 8 * len(s), 13, "y", scale=2)
        # Нибл
        ox, oy = 24, 28
        if boom:
            head = S["nibbleShock"]
            ox += [1, -1, 1][i % 3]
        elif v == 0 and i > 2:
            head = S["nibbleShock"]
        elif v in (1023,):
            head = S["nibbleHappy"]
        elif isinstance(v, int) and v >= 15:
            head = S["nibble"]
        else:
            head = S["nibbleHappy"] if i % 2 else S["nibble"]
        nib_at(c, head, ox, oy)
        # лапки с «пальцами»
        for px in (ox - 3, ox + 16):
            c.box(px, oy + 8, 4, 4, "n")
            c.put(px + 1, oy + 7, "k")
            c.put(px + 2, oy + 7, "k")
        if isinstance(v, int) and 63 <= v < 1023:
            c.put(ox + 14, oy + 3 + i % 3, "c")
        if v == 1023 and i == 15:
            sparkle(c, ox - 6, oy - 4, 1)
            sparkle(c, ox + 19, oy - 2, 1)
        if boom:
            for k in range(6):
                x = (k * 11 + i * 7) % 60
                stamp(c, STAR, x, 9 + (k * 5 + i) % 4, "y")
        if v == 0 and i > 2:
            for k in range(2):
                t = (i - 19) * 2 + k
                puff(c, ox + 6 + k * 4, oy - 3 - t, 3 + k, "l")
        frames.append(c)
    save("meme-nibble-1023", frames, durs, backdrop=True)


def meme_router():
    """Урок 2. На роутере 100, в загрузке 12. Нибл объясняет: делить на 8."""
    frames, durs = [], []
    for i in range(22):
        c = meme_canvas(38)
        # Мега за столом
        if i < 4:
            head, mx = S["megaHappy"], 23
        elif i < 14:
            head, mx = S["mega"], 25
        else:
            head, mx = S["megaHappy"], 24
        c.sprite(head, mx, 17)
        desk(c, 36)
        # роутер
        c.rect(4, 18, 1, 8, "l")
        c.rect(15, 18, 1, 8, "l")
        c.box(2, 26, 16, 10, "s", "l")
        c.text("100", 5, 28, "w" if i < 4 and i % 2 else "g")
        for k in range(4):
            c.put(5 + k * 3, 34, "g" if (i + k) % 3 else "y")
        if i < 4:
            sparkle(c, 18, 19 + i % 2, i)
        # ноутбук
        c.box(44, 18, 18, 16, "h", "l")
        c.text("12", 47, 20, "y", scale=2)
        prog = min(i, 13)
        c.rect(46, 31, 14, 1, "B")
        c.rect(46, 31, prog // 2 + 1, 1, "g")
        c.rect(42, 34, 22, 2, "s")
        c.rect(42, 34, 22, 1, "l")
        if 7 <= i < 11:
            c.glyph("?", 31, 10 + (i % 2), "w")
        # Нибл выпрыгивает снизу с подсказкой
        if i >= 10:
            ny = [44, 38, 34, 33][min(i - 10, 3)]
            nib_at(c, S["nibbleHappy"], 1, ny)
        if 12 <= i < 16:
            c.box(14, 3, 15, 9, "w", "w")
            c.text("÷8", 17, 5, "k")
            c.put(13, 12, "w")
            c.put(12, 13, "w")
        if i >= 14:
            c.glyph("!", 31, 9 + (i % 2), "y")
        if i >= 16:
            c.box(13, 1, 39, 9, "h", "M")
            c.text("100÷8=12", 17, 3, "y")
        frames.append(c)
        durs.append(300 if i < 4 else 200 if i < 10 else 160 if i < 12 else 260)
    durs[-1] = 1100
    save("meme-router", frames, durs, backdrop=True)


def fire(c, x0, x1, base, height, rnd):
    """Языки пламени от base вверх. Внизу жёлтое ядро, сверху красные кончики."""
    for x in range(x0 - x0 % 2, x1, 2):  # языки шириной 2 пикселя
        h = max(0, height + rnd.randrange(-2, 3) + (3 if x % 6 == 2 else 0))
        for k in range(h):
            r = k / max(h, 1)
            col = "y" if r < 0.35 else "F" if r < 0.7 else "r"
            c.put(x, base - k, col)
            if k < h - 1:
                c.put(x + 1, base - k, col)


def meme_this_is_fine():
    """Урок 3. Процессор при 100 °C: кругом пожар, а Бит пьёт чай."""
    import random
    rnd = random.Random(3)
    frames, durs = [], []
    for i in range(16):
        c = meme_canvas(40, "t")
        c.rect(0, 40, MW, 1, "T")
        # дым под потолком
        for k in range(min(i // 3 + 1, 5)):
            puff(c, k * 13 + (i // 4 % 2), (k % 2), 5, "s")
            puff(c, k * 13 + 6, 1, 5, "l" if k % 2 else "s")
        # портрет процессора на стене
        c.box(47, 6, 13, 13, "s", "M")
        c.box(50, 9, 7, 7, "B", "l")
        c.rect(52, 11, 3, 3, "M")
        for k in (51, 53, 55):
            c.put(k, 8, "y")
            c.put(k, 16, "y")
        for k in (10, 12, 14):
            c.put(49, k, "y")
            c.put(57, k, "y")
        # градусник
        c.box(6, 6, 4, 22, "w")
        c.box(5, 27, 6, 5, "r", "R")
        lvl = min(4 + i * 3, 21)
        c.rect(7, 27 - lvl, 2, lvl, "r")
        if i >= 6:
            c.text("100", 12, 6, "r" if i % 2 else "y")
        # Бит за столом с кружкой
        sip = 11 <= i < 14
        head = BLINK if i in (4, 9) else S["bitHappy"]
        c.sprite(head, 24, 20)
        mx, my = (29, 26) if sip else (38, 29)
        c.box(mx, my, 5, 5, "w")
        c.rect(mx + 5, my + 1, 1, 3, "w")
        c.rect(mx + 1, my + 1, 3, 1, "d")
        if not sip:
            t = i % 4
            c.put(mx + 2 - (t % 2), my - 2 - t // 2, "l")
            c.put(mx + 3, my - 4 - t // 2, "l")
        # лапа держит кружку
        c.rect(mx - 2, my + 2, 2, 2, "o")
        desk(c, 34, 16, 48)
        c.rect(18, 37, 2, 3, "T")
        c.rect(44, 37, 2, 3, "T")
        # огонь растёт
        h = min(3 + i * 3 // 2, 16)
        fire(c, 0, 16, 47, h, rnd)
        fire(c, 48, 64, 47, h, rnd)
        fire(c, 16, 48, 47, max(0, h - 10), rnd)
        frames.append(c)
        durs.append(180)
    durs[-1] = 700
    save("meme-this-is-fine", frames, durs, backdrop=True)


def ram_stick(c, x, y):
    """Планка оперативной памяти: зелёная плата, чёрные чипы, золотые контакты."""
    c.box(x, y, 16, 8, "G", "g")
    for k in range(4):
        c.box(x + 1 + k * 4, y + 2, 3, 3, "s", "k")
    for k in range(7):
        c.put(x + 1 + k * 2, y + 6, "y")
    c.put(x + 8, y + 7, "b")


def meme_ram_monster():
    """Урок 3. Браузер ест оперативную память, планку за планкой."""
    frames, durs = [], []
    total = 4
    for i in range(22):
        c = meme_canvas(42)
        c.rect(0, 42, MW, 1, "s")
        stick, step = divmod(i, 4)
        eaten = min(stick, total) if step < 3 else min(stick + 1, total)
        if i >= 16:
            eaten = total
        # шкала свободной памяти
        level = 8 - eaten * 2
        c.box(2, 2, 26, 7, "h", "l")
        for k in range(8):
            if k < level:
                col = "g" if level > 4 else "y" if level > 2 else "r"
                c.rect(3 + k * 3, 3, 2, 5, col)
        if level == 0 and i % 2:
            c.text("0%", 30, 3, "r")
        # конвейер
        c.rect(14, 40, 24, 2, "s")
        for k in range(6):
            c.put(15 + (k * 4 + i) % 22, 40, "l")
        if i < 16:
            x = [15, 19, 24, 29][step]
            ram_stick(c, x, 32)
        # монстр-браузер
        mouth_open = (i < 16 and step == 2) or i in (17, 18)
        tabs = 1 + eaten
        for k in range(tabs):
            c.box(34 + k * 6, 5, 6, 4, "rygcm"[k % 5], "k")
        c.box(32, 8, 30, 33, "n", "k")
        c.rect(33, 9, 28, 2, "N")
        c.rect(57, 9, 3, 2, "r")
        # глаза со злыми бровями
        for ex in (37, 50):
            c.box(ex, 15, 6, 5, "w", "k")
            c.rect(ex + 2, 16, 2, 3, "r")
        c.line(36, 13, 42, 15, "k")
        c.line(56, 13, 50, 15, "k")
        if mouth_open:
            c.box(36, 22, 22, 14, "R", "k")
            for k in range(5):
                c.rect(38 + k * 4, 23, 2, 2, "w")
                c.rect(38 + k * 4, 33, 2, 2, "w")
        else:
            c.rect(36, 28, 22, 1, "k")
            for k in range(5):
                c.rect(38 + k * 4, 26, 2, 2, "w")
            if i < 16 and step == 3:
                for k in range(4):
                    c.put(30 - k * 3, 31 + (k * 3) % 5, "G")
        if i in (17, 18):
            puff(c, 26, 22 - (i - 17) * 2, 5, "l")
        c.rect(35, 41, 3, 1, "k")
        c.rect(56, 41, 3, 1, "k")
        # Бит смотрит
        if eaten < 2:
            head = S["bit"]
        elif i < 16:
            head = S["bitShock"]
        else:
            head = S["bitCry"]
        bit_at(c, head, 0, 23)
        frames.append(c)
        durs.append(150 if i < 16 else 260)
    durs[-1] = 1000
    save("meme-ram-monster", frames, durs, backdrop=True)


def meme_47_tabs():
    """Урок 3. «У меня всё тормозит»: 47 вкладок и три антивируса дерутся."""
    frames, durs = [], []
    for i in range(22):
        c = meme_canvas(37)
        frozen = i >= 17
        # системный блок и дым
        c.box(56, 12, 8, 24, "s", "l")
        c.put(59, 15, "r" if i % 2 else "g")
        c.rect(58, 20, 4, 1, "B")
        c.rect(58, 22, 4, 1, "B")
        if i >= 8:
            for k in range(2):
                t = (i + k * 3) % 6
                puff(c, 57 + k * 2, 9 - t, 3 + t // 3, "l" if t < 3 else "B")
        # монитор
        c.box(16, 3, 38, 29, "h", "l")
        c.rect(32, 32, 6, 3, "s")
        # вкладки: их всё больше, и они всё тоньше
        n = min(3 + i * 3, 47)
        width = 34
        step = max(1, min(3, width // n))
        for k in range(min(n, width // step)):
            col = "n" if k % 2 else "N"
            c.rect(18 + k * step, 5, max(1, step - 1), 2, col)
        c.rect(18, 7, 34, 1, "l")
        # три антивируса дерутся
        for k, col in enumerate("gcy"):
            jitter = 0 if frozen else [0, 1, 0, -1][(i + k) % 4]
            x = 20 + k * 8 + jitter
            y = 11 + (0 if frozen else (i + k) % 2)
            stamp(c, SHIELD, x, y, "B" if frozen else col)
        if not frozen and i % 2:
            c.line(25, 13, 28, 15, "w")
            c.line(33, 15, 36, 13, "w")
        # четвёртый антивирус
        if i >= 15:
            stamp(c, SHIELD, 45, 11 + (1 if i == 15 else 0), "r")
        spinner(c, 35, 24, 0 if frozen else i)
        # Дедушка Мега
        desk(c, 35)
        if i < 6:
            head = S["mega"]
        elif i < 17:
            head = MEGA_BLINK if i % 5 == 0 else S["mega"]
        else:
            head = MEGA_BLINK
        mega_at(c, head, 1, 21)
        if 6 <= i < 12:
            c.glyph("?", 8, 13 + i % 2, "w")
        if 12 <= i < 17:
            stamp(c, VEIN, 13, 18, "r")
        if frozen:
            c.put(15, 27 + (i - 17), "c")
        frames.append(c)
        durs.append(170 if not frozen else 300)
    durs[-1] = 1000
    save("meme-47-tabs", frames, durs, backdrop=True)


def usb_plug(c, px, y, h, top):
    """Штекер USB сбоку: корпус, металл, контакты сверху (top) или снизу.
    h = 7 обычный вид, 3 и 1 кадры переворота."""
    cy = y + 3
    half = h // 2
    for dy in range(-half, half + 1):
        c.rect(px, cy + dy, 9, 1, "n")
        c.rect(px + 9, cy + dy, 8, 1, "l")
    if h > 1:
        c.rect(px, cy - half, 9, 1, "w")
        c.rect(px, cy + half, 9, 1, "N")
    if h == 7:
        c.rect(px + 10, cy - 1, 6, 3, "k")
        c.rect(px + 10, cy - 2 if top else cy + 2, 6, 1, "y")
        c.rect(px + 2, cy - 1, 5, 1, "N")
        c.rect(px + 2, cy + 1, 5, 1, "N")
    # кабель
    c.rect(19, cy, px - 19, 1, "N")


def meme_usb():
    """Урок 4. Флешка влезает только с третьей попытки, хотя сторона та же."""
    plan = [
        (20, 7, True, "bit", None), (24, 7, True, "bit", None), (27, 7, True, "bit", "bump"),
        (25, 7, True, "bitAngry", "no"),
        (25, 3, True, "bitAngry", "flip"), (25, 1, True, "bitAngry", "flip"), (25, 3, False, "bitAngry", "flip"),
        (25, 7, False, "bitAngry", None),
        (27, 7, False, "bitAngry", "bump"), (25, 7, False, "bitCry", "no"),
        (25, 3, False, "bitCry", "flip"), (25, 1, False, "bitCry", "flip"), (25, 3, True, "bitCry", "flip"),
        (25, 7, True, "bitCry", None),
        (29, 7, True, "bitShock", None), (31, 7, True, "bitShock", "in"),
        (31, 7, True, "bitCool", "yes"), (31, 7, True, "bitCool", "yes"), (31, 7, True, "bitCool", "yes"),
    ]
    durs = [220, 100, 90, 450, 90, 90, 90, 200, 90, 450, 90, 90, 90, 200, 100, 300, 200, 200, 1000]
    frames = []
    for i, (px, h, top, face, ev) in enumerate(plan):
        c = meme_canvas(42)
        desk(c, 40)
        usb_plug(c, px, 23, h, top)
        # системный блок поверх штекера
        c.box(44, 4, 20, 36, "s", "l")
        c.rect(54, 8, 3, 3, "g" if ev in ("in", "yes") else "B")
        c.rect(48, 14, 12, 1, "B")
        c.rect(48, 16, 12, 1, "B")
        c.rect(44, 23, 2, 7, "k")
        c.rect(48, 33, 12, 1, "B")
        # Бит держит провод
        bit_at(c, S[face], 0, 22)
        c.box(15, 24, 4, 4, "o")
        if ev == "bump":
            stamp(c, STAR, 42, 18, "y")
            stamp(c, STAR, 41, 30, "y")
        if ev == "no":
            c.text("!", 37, 6, "r", 2)
        if ev == "flip":
            # стрелки переворота по кругу
            c.line(26, 17, 38, 17, "w")
            c.put(39, 18, "w")
            c.put(39, 19, "w")
            c.put(37, 16, "w")
            c.put(37, 18, "w")
            c.line(28, 33, 40, 33, "w")
            c.put(27, 32, "w")
            c.put(27, 31, "w")
            c.put(29, 32, "w")
            c.put(29, 34, "w")
        if ev in ("in", "yes"):
            for k in range(3):
                sparkle(c, 26 + k * 7, 8 + (k * 7 + i) % 9, i + k)
        frames.append(c)
    save("meme-usb", frames, durs, backdrop=True)


def clock(c, cx, cy, t):
    c.box(cx - 5, cy - 4, 11, 9, "w", "l")
    c.rect(cx - 4, cy - 5, 9, 1, "l")
    c.rect(cx - 4, cy + 5, 9, 1, "l")
    dirs = [(0, -3), (2, -2), (3, 0), (2, 2), (0, 3), (-2, 2), (-3, 0), (-2, -2)]
    dx, dy = dirs[t % 8]
    c.line(cx, cy, cx + dx, cy + dy, "k")
    dx, dy = dirs[(t // 4) % 8]
    c.line(cx, cy, cx + dx // 2, cy + dy // 2, "r")


def meme_update_99():
    """Урок 4. Обновление на 99 % с утра до ночи. Дошло до 100, и всё сначала."""
    frames, durs = [], []
    for i in range(22):
        c = meme_canvas(39)
        # окно: день, вечер, ночь, утро
        sky = "c" if i < 5 else "F" if i < 9 else "U" if i < 14 else "c"
        c.box(3, 3, 14, 12, sky, "l")
        if sky == "c":
            c.rect(5 + (i % 5), 5, 3, 3, "y")
        elif sky == "F":
            c.rect(9, 10 + (i - 5) // 2, 3, 3, "r")
        else:
            c.rect(12, 5, 2, 3, "y")
            c.put(11, 5, "y")
            c.put(6, 6, "w")
            c.put(8, 11, "w")
        c.rect(10, 4, 1, 10, "l")
        c.rect(4, 9, 12, 1, "l")
        clock(c, 55, 8, i * 3)
        # монитор с обновлением
        c.box(20, 10, 28, 24, "u", "l")
        c.rect(31, 34, 6, 3, "s")
        if i < 14:
            spinner(c, 33, 17, i, "w", "n", "u")
            c.text("99%", 28, 24, "w")
        elif i < 17:
            c.text("100%", 26, 24, "y")
            sparkle(c, 22, 12, i)
        else:
            spinner(c, 33, 17, i, "w", "n", "u")
            c.text("0%", 30, 24, "w")
        # паутина растёт
        web = min(max(i - 6, 0), 5)
        for k in range(web):
            c.put(21 + k, 11, "w")
            c.put(21, 11 + k, "w")
            if k < 4:
                c.put(21 + k, 11 + k, "w")
        if web >= 4:
            c.line(24, 11, 21, 14, "w")
        # Бит ждёт, засыпает, просыпается
        if i < 5:
            head = S["bit"]
        elif i < 8:
            head = BLINK if i % 2 else S["bit"]
        elif i < 14:
            head = S["bitSleep"]
        elif i < 17:
            head = S["bitShock"]
        else:
            head = S["bitCry"]
        c.sprite(head, 2, 23)
        if 8 <= i < 14:
            t = (i - 8) % 3
            c.glyph("Z", 12 + t * 2, 19 - t * 2, "w")
        desk(c, 37)
        frames.append(c)
        durs.append(240 if i < 14 else 220)
    durs[13] = 400
    durs[16] = 600
    durs[-1] = 1100
    save("meme-update-99", frames, durs, backdrop=True)


def landscape(c):
    c.box(4, 2, 56, 34, "c", "l")
    c.rect(48, 5, 5, 5, "y")
    for x, y in ((9, 7), (30, 5)):
        c.rect(x, y, 7, 2, "w")
        c.rect(x + 2, y - 1, 3, 1, "w")
    for x in range(5, 59):
        top = 25 + round(3 * __import__("math").sin(x / 6))
        c.rect(x, top, 1, 35 - top, "g")
        c.rect(x, max(top + 3, 31), 1, 35 - max(top + 3, 31), "G")


FLY = {0: ["l...l", ".lkl.", "..k.."], 1: [".....", "llkll", "..k.."]}


def meme_dead_pixel():
    """Урок 4. «Битый пиксель» оказался мухой."""
    frames, durs = [], []
    path = [(18, 14), (26, 9), (36, 15), (46, 22), (52, 30), (46, 36), (38, 38)]
    for i in range(22):
        c = meme_canvas(41)
        landscape(c)
        c.rect(28, 36, 8, 3, "s")
        desk(c, 39)
        dot = (24, 12) if i < 6 else (40, 9) if i < 9 else (14, 18)
        paw = None
        if 3 <= i < 6:
            paw = [(30, 26), (27, 18), (23, 12)][i - 3]
        elif 6 <= i < 9:
            paw = [(33, 22), (37, 14), (39, 9)][i - 6]
        if i < 10:
            c.put(dot[0], dot[1], "k")
        elif i < 17:
            fx, fy = path[i - 10]
            c.sprite(FLY[i % 2], fx - 2, fy - 1)
            c.put(fx - 4, fy + 1, "l")
            c.put(fx - 5, fy, "l")
        # Бит смотрит в монитор
        if i < 5:
            head = LOOKUP
        elif i < 10:
            head = S["bitAngry"]
        elif i < 17:
            head = S["bitShock"]
        else:
            head = BIT_CROSS
        bit_at(c, head, 24, 28)
        if i == 10:
            c.sprite(FLY[0], dot[0] - 2, dot[1] - 1)
        if paw:
            x, y = paw
            c.line(38, 40, x + 1, y + 3, "o")
            c.line(39, 40, x + 2, y + 3, "o")
            c.box(x, y, 4, 4, "o")
        if i >= 17:
            # муха села Биту на нос
            c.sprite(FLY[i % 2], 29, 37)
            c.glyph("!", 43, 24 + i % 2, "y")
        frames.append(c)
        durs.append(300 if i < 3 else 160)
    durs[5] = 400
    durs[9] = 350
    durs[10] = 300
    durs[-1] = 1000
    save("meme-dead-pixel", frames, durs, backdrop=True)


MEME_GIFS = (meme_10_types, meme_nibble_1023, meme_router, meme_this_is_fine, meme_ram_monster,
             meme_47_tabs, meme_usb, meme_update_99, meme_dead_pixel)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for fn in (wave, idle, party, sad, think, laptop, bits_float) + CHARACTER_GIFS + MEME_GIFS:
        fn()
    for f in sorted(OUT.glob("*.gif")):
        print(f.name, f.stat().st_size)
