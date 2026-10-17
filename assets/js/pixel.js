// Пиксель-арт кодом: спрайт задаётся строками, одна буква = один пиксель.
// Левая половина рисуется, правая отражается (mirror: true).
// mirror: false значит строка записана целиком (для несимметричных героев).
(function () {
  const PALETTE = {
    k: "#14161c", // контур
    o: "#f2a65a", // рыжая шерсть
    d: "#c47a34", // тень шерсти
    w: "#fff4e0", // белая мордочка
    g: "#5cf29a", // светящиеся глаза
    p: "#ff8fa3", // нос
    c: "#6cc7ff", // голубой
    y: "#ffe066", // жёлтый
    r: "#ff6b6b", // красный
    s: "#3a4a42", // серый металл
    n: "#e3e6ee", // светлая шерсть Нибл
    N: "#9aa1b2", // серая шерсть Нибл
    e: "#a9aeb8", // седая шерсть Дедушки Меги
    E: "#6e7482", // тень седой шерсти
    v: "#b25cff", // фиолетовый Глюк
    V: "#6c2bd1", // тёмно-фиолетовый Глюк
    m: "#ff3df0", // малиновый сбой
    // оттенки для HD-спрайтов (assets/js/sprites-hd.js)
    O: "#ffc985", // светлая рыжая шерсть (блик)
    D: "#8f4a1c", // глубокая тень рыжей шерсти
    W: "#ffffff", // чисто-белый блик в глазах
    j: "#1fae63", // тёмно-зелёный низ глаза
    C: "#2f86d6", // тёмно-голубой (глаза Нибл, слёзы)
    P: "#c8466a", // тёмно-розовый (открытый рот)
    i: "#d9a6ff", // светло-фиолетовый блик Глюка
    x: "#b8323f", // тёмно-красный (глаза Глюка)
    q: "#a3168f", // тёмно-малиновый (бантик Нибл)
  };

  // Бит из семьи Байт. Левая половина 8 пикселей, отражается в 16x14.
  const SPRITES = {
    bit: { mirror: true, rows: [
      "........",
      ".k......",
      ".kk.....",
      ".kok....",
      ".kook...",
      ".koookkk",
      "kooooooo",
      "kooooooo",
      "koggoooo",
      "koggoooo",
      "kdoooooo",
      "kdowwwwp",
      ".kdwwwww",
      "..kkkkkk",
    ]},
    // Бит в шоке (для мемов)
    bitShock: { mirror: true, rows: [
      "........",
      ".k......",
      ".kk.....",
      ".kok....",
      ".kook...",
      ".koookkk",
      "kooooooo",
      "kowwkooo",
      "kowgkooo",
      "kowwkooo",
      "kdoooooo",
      "kdowwwkk",
      ".kdwwwkr",
      "..kkkkkk",
    ]},
    // Бит довольный (глаза-дуги)
    bitHappy: { mirror: true, rows: [
      "........",
      ".k......",
      ".kk.....",
      ".kok....",
      ".kook...",
      ".koookkk",
      "kooooooo",
      "kooooooo",
      "kokkoooo",
      "koookooo",
      "kdoooooo",
      "kdowwwwp",
      ".kdwwwww",
      "..kkkkkk",
    ]},
    // Бит злится: брови домиком вниз, рот сжат
    bitAngry: { mirror: true, rows: [
      "........",
      ".k......",
      ".kk.....",
      ".krk....",
      ".krrk...",
      ".koookkk",
      "kooooooo",
      "kkkooooo",
      "kogkoooo",
      "koggoooo",
      "kdoooooo",
      "kdowkkkp",
      ".kdkwwww",
      "..kkkkkk",
    ]},
    // Бит спит: глаза закрыты, рот приоткрыт
    bitSleep: { mirror: true, rows: [
      "........",
      ".k......",
      ".kk.....",
      ".kok....",
      ".kook...",
      ".koookkk",
      "kooooooo",
      "kooooooo",
      "kkookooo",
      "kokkoooo",
      "kdoooooo",
      "kdowwwwp",
      ".kdwwwwk",
      "..kkkkkk",
    ]},
    // Бит в пиксельных очках: крутой
    bitCool: { mirror: true, rows: [
      "........",
      ".k......",
      ".kk.....",
      ".kok....",
      ".kook...",
      ".koookkk",
      "kooooooo",
      "kooooooo",
      "kkkkkkkk",
      "kkwkkkoo",
      "kdkkkooo",
      "kdowwwwp",
      ".kdwkwww",
      "..kkkkkk",
    ]},
    // Бит плачет: брови грустные, слёзы ручьём
    bitCry: { mirror: true, rows: [
      "........",
      ".k......",
      ".kk.....",
      ".kok....",
      ".kook...",
      ".koookkk",
      "kooooooo",
      "koookooo",
      "kookgooo",
      "kokggooo",
      "kdocoooo",
      "kdocwwwp",
      ".kdcwkkk",
      "..kkkkkk",
    ]},
    // Нибл, младшая сестра Бита (полубайт). Голова меньше, бантик на ухе.
    nibble: { mirror: false, rows: [
      "................",
      "................",
      "...........mm.mm",
      "..k........mmrmm",
      "..kk.......mmkmm",
      "..knk.....knk...",
      "..knnkkkkkknnk..",
      ".knnnnnNNnnnnnk.",
      ".knccnnnnnnccnk.",
      ".knckNnnnnNckNk.",
      ".knnnnnnnnnnnnk.",
      ".kNnwwwppwwwnNk.",
      "..kNwwwwwwwwNk..",
      "...kkkkkkkkkk...",
    ]},
    nibbleHappy: { mirror: false, rows: [
      "................",
      "................",
      "...........mm.mm",
      "..k........mmrmm",
      "..kk.......mmkmm",
      "..knk.....knk...",
      "..knnkkkkkknnk..",
      ".knnnnnNNnnnnnk.",
      ".knkknnnnnnkknk.",
      ".knnnknnnnknnnk.",
      ".knnnnnnnnnnnnk.",
      ".kNnwwwppwwwnNk.",
      "..kNwwkkkkwwNk..",
      "...kkkkkppkkk...",
    ]},
    nibbleShock: { mirror: false, rows: [
      "................",
      "................",
      "...........mm.mm",
      "..k........mmrmm",
      "..kk.......mmkmm",
      "..knk.....knk...",
      "..knnkkkkkknnk..",
      ".knnnnnNNnnnnnk.",
      ".kwwknnnnnwwknk.",
      ".kwckNnnnnwckNk.",
      ".kwwknnnnnwwknk.",
      ".kNnwwwppwwwnNk.",
      "..kNwwwkkwwwNk..",
      "...kkkkkkkkkk...",
    ]},
    // Дедушка Мега (Мегабайт): седой, круглые очки, длинные усы
    mega: { mirror: true, rows: [
      "........",
      "..k.....",
      "..kk....",
      "..kek...",
      "..keek..",
      "..keeekk",
      ".keeeeee",
      ".kwwweee",
      ".keekkee",
      ".kkgckkk",
      ".kkggkee",
      ".keekkee",
      ".keeeeep",
      "wwweewww",
      "..wkwwww",
      "..kwwwww",
      "...kwwww",
      "....kwww",
      ".....kkw",
    ]},
    megaHappy: { mirror: true, rows: [
      "........",
      "..k.....",
      "..kk....",
      "..kek...",
      "..keek..",
      "..keeekk",
      ".keeeeee",
      ".kwwweee",
      ".keekkee",
      ".kkeeekk",
      ".kkkkkee",
      ".keekkee",
      ".keeeeep",
      "wwweewww",
      "..wkwwkk",
      "..kwwwww",
      "...kwwww",
      "....kwww",
      ".....kkw",
    ]},
    // Глюк: фиолетовый жук-сбой, путает данные. Нарочно несимметричный.
    glitch: { mirror: false, rows: [
      "..r.........r...",
      "...k.......k....",
      "....k.....k.....",
      "..kkkkkkkkkkkk..",
      ".kvvvvvvvvvvvvk.",
      "kvvrrrvvvvrrvvvk",
      "kvrrykvvvvryvvk.",
      "ckvrrrvvvvrrvvvk",
      "kvvvvvvvvvvvvvvk",
      "kVkkkkkkkkkkkkVk",
      "kVkwkwkmkwkwkkVk",
      ".kVkkkkkkkkkkVk.",
      "..kVVVVVVVVVVk..",
      "..k.k.k..k.k.k..",
    ]},
    glitchLaugh: { mirror: false, rows: [
      "..r.........r...",
      "...k.......k....",
      "....k.....k.....",
      "..kkkkkkkkkkkk..",
      ".kvvvvvvvvvvvvk.",
      "kvvkkkvvvvvkkvvk",
      "kvkvvvkvvvkvvkk.",
      "ckvvvvvvvvvvvvvk",
      "kVkkkkkkkkkkkkVk",
      "kVkwkwkwkwkwkkVk",
      "kVkmmmmmmmmmmkVk",
      ".kVkkkmmmkkkkVk.",
      "..kVVkkkkkVVVk..",
      "..k.k.k..k.k.k..",
    ]},
    glitchHurt: { mirror: false, rows: [
      "................",
      "..r..........r..",
      "...k........k...",
      "..kkkkkkkkkkkk..",
      ".kvvvvvvvvvvvvk.",
      "kvvkvkvvvvkvkvvk",
      "kvvvkvvvvvvkvvvk",
      "kvvkvkvvvvkvkvvk",
      "kvvvvvvvvvvvvvvk",
      "kVvvkvkvkvkvvvVk",
      "kVvkvkvkvkvkvvVk",
      ".kVvvvvvvvvvvVk.",
      "..kVVVVVVVVVVk..",
      "..k.k.k..k.k.k..",
    ]},
  };

  function expand(sprite) {
    return sprite.rows.map((row) =>
      sprite.mirror ? row + row.split("").reverse().join("") : row
    );
  }

  function toSVG(name, label) {
    const rows = expand(SPRITES[name]);
    const h = rows.length;
    const w = rows[0].length;
    let rects = "";
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === "." || !PALETTE[ch]) continue;
        // склеиваем одинаковые пиксели в строке, чтобы SVG был меньше
        let run = 1;
        while (row[x + run] === ch) run++;
        rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${PALETTE[ch]}"/>`;
        x += run - 1;
      }
    });
    const a11y = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
    return `<svg class="px" viewBox="0 0 ${w} ${h}" ${a11y} xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
  }

  // <span data-px="bit" data-label="Бит"></span> → картинка
  function mount(root) {
    (root || document).querySelectorAll("[data-px]").forEach((el) => {
      const name = el.dataset.px;
      if (!SPRITES[name]) return;
      el.outerHTML = toSVG(name, el.dataset.label || "").replace(
        'class="px"',
        `class="px ${el.className || ""}"`
      );
    });
  }

  window.Pixel = { toSVG, mount, SPRITES, PALETTE };
  document.addEventListener("DOMContentLoaded", () => mount());
})();
