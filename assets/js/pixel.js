// Пиксель-арт кодом: спрайт задаётся строками, одна буква = один пиксель.
// Левая половина рисуется, правая отражается (mirror: true).
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
