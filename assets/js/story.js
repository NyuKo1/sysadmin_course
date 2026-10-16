// Катсцены Памятьвиля: маленький плеер пиксельных сценок, без библиотек.
//
// В странице: <div class="story" data-story="l03-intro"></div>
// Сценка:     window.STORIES["l03-intro"] = { title: "...", beats: [ ... ] }
//
// Кадр (beat) может содержать:
//   bg:    "street" | "street:translator" | "tower:hot" | ... (фон, вариант после двоеточия)
//   mood:  "hot" | "alarm" | "dark" | null           (цветная подсветка поверх сцены)
//   sign:  "01000010 = B" | null                     (табличка с текстом сверху)
//   show:  { bit: { x: 30, sprite: "bitHappy", y: 12, face: -1 } }  (поставить сразу)
//   do:    "bit enter left 30; glitch shake; mega as megaHappy"     (действия)
//          enter left|right [x], exit left|right, move x, jump, shake, bounce,
//          float, flip, face left|right, as <спрайт>, hide
//   who:   "bit" (говорит персонаж) или любой текст-имя; без who это голос рассказчика
//   say:   "Текст реплики"
//   fx:    "shake flash glitch bits confetti smoke:70 smoke:bit zoom:bit"
//   wait:  1500 (для кадра без текста: через сколько мс перейти дальше)
(function () {
  "use strict";
  const STORIES = (window.STORIES = window.STORIES || {});
  const W = 160, H = 90;          // логическая сетка фона в «пикселях»
  const GROUND = 12;              // где стоят герои, % от низа сцены
  const SEEN = "story-seen-";
  const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Актёры. fallback: как подкрасить Бита, если своего спрайта ещё нет.
  const CAST = {
    bit:    { name: "Бит", sprite: "bit", x: 34, scale: 1.7 },
    nibble: { name: "Нибл", sprite: "nibble", x: 14, scale: 1.4, fallback: "grayscale(1) brightness(1.6)" },
    mega:   { name: "Дедушка Мега", sprite: "mega", x: 58, scale: 1.9, fallback: "grayscale(1) brightness(1.1)" },
    glitch: { name: "Глюк", sprite: "glitch", x: 82, scale: 1.8, idle: "float", fallback: "hue-rotate(250deg) saturate(2.2)" },
  };

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- спрайты ----------
  function sprites() { return (window.Pixel && window.Pixel.SPRITES) || {}; }
  // Нужный спрайт → базовый спрайт героя → Бит (с подкраской). Страница не ломается никогда.
  function resolve(id, want, cast) {
    const S = sprites(), c = cast[id] || {};
    if (want && S[want]) return { name: want, filter: "" };
    if (c.sprite && S[c.sprite]) return { name: c.sprite, filter: "" };
    return { name: S.bit ? "bit" : null, filter: c.fallback || "" };
  }
  function spriteSize(name) {
    const s = sprites()[name];
    if (!s) return { w: 16, h: 14 };
    return { w: s.rows[0].length * (s.mirror ? 2 : 1), h: s.rows.length };
  }

  // ---------- фоны: пиксель-арт кодом ----------
  function rng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = (x, y, w, h, f, a) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${a ? " " + a : ""}/>`;
  const T = (x, y, txt, size, f, a) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${f}" font-family="ui-monospace,Menlo,Consolas,monospace"${a ? " " + a : ""}>${esc(txt)}</text>`;
  const anim = (rand, cls, min, spread) =>
    `class="${cls}" style="animation-delay:-${(rand() * 6).toFixed(2)}s;animation-duration:${(min + rand() * spread).toFixed(2)}s"`;
  const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

  function sky(rand, c1, c2, c3) {
    let s = R(0, 0, W, H, c1) + R(0, 20, W, 22, c2) + R(0, 42, W, 48, c3);
    for (let i = 0; i < 28; i++) {
      const x = Math.floor(rand() * W), y = Math.floor(rand() * 40);
      s += R(x, y, 1, 1, rand() < 0.3 ? "#ffe066" : "#c9d6ff", rand() < 0.5 ? anim(rand, "st-twinkle", 2, 4) : 'opacity=".7"');
    }
    return s;
  }
  function bitClouds(rand, n, color) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const y = 7 + i * 8 + Math.floor(rand() * 3);
      const txt = Array.from({ length: 3 }, () => Math.floor(rand() * 16).toString(2).padStart(4, "0")).join(" ");
      s += `<g class="st-drift" style="animation-duration:${(36 + rand() * 30).toFixed(0)}s;animation-delay:-${(rand() * 60).toFixed(0)}s">${T(Math.floor(rand() * 70), y, txt, 4, color, 'opacity=".8"')}</g>`;
    }
    return s;
  }
  function moon(x, y) {
    const c = "#fff1b8";
    return R(x + 2, y, 4, 1, c) + R(x + 1, y + 1, 6, 1, c) + R(x, y + 2, 8, 4, c) + R(x + 1, y + 6, 6, 1, c) +
      R(x + 2, y + 7, 4, 1, c) + R(x + 2, y + 2, 2, 2, "#e3d08e") + R(x + 5, y + 4, 1, 1, "#e3d08e");
  }
  // Дом с окнами. lit: доля горящих окон.
  function house(rand, x, w, h, base, lit, groundY) {
    const y = groundY - h;
    let s = R(x, y, w, h, base) + R(x, y, w, 1, "#2f4038");
    if (rand() < 0.5) s += R(x + 2, y - 4, 1, 4, "#3a4a42") + R(x + 1, y - 5, 3, 1, "#3a4a42");
    for (let wy = y + 3; wy < groundY - 4; wy += 5) {
      for (let wx = x + 2; wx < x + w - 3; wx += 4) {
        const on = rand() < lit;
        const col = on ? pick(rand, ["#ffe066", "#ffe066", "#e0a458", "#6cc7ff", "#fff4e0"]) : "#0b1110";
        s += R(wx, wy, 2, 3, col, on && rand() < 0.18 ? anim(rand, "st-blink", 3, 5) : "");
      }
    }
    return s;
  }
  function pcbGround(rand, y, base, trace) {
    let s = R(0, y, W, H - y, base);
    for (let ty = y + 4; ty < H; ty += 5) {
      let x = Math.floor(rand() * 10);
      while (x < W) {
        const len = 8 + Math.floor(rand() * 24);
        s += R(x, ty, len, 1, trace) + R(x + len, ty - 1, 2, 2, "#e0a458");
        x += len + 6 + Math.floor(rand() * 10);
      }
    }
    return s;
  }
  function lamp(x, groundY) {
    return `<polygon points="${x - 7},${groundY} ${x + 8},${groundY} ${x + 2},${groundY - 15} ${x - 1},${groundY - 15}" fill="#ffe066" opacity=".07"/>` +
      R(x, groundY - 16, 1, 16, "#3a4a42") + R(x - 2, groundY - 17, 5, 2, "#3a4a42") + R(x - 1, groundY - 15, 3, 1, "#ffe066");
  }

  const BG = {
    // Улица Памятьвиля ночью. Варианты: translator (на площади Переводчик), broken (он сломан)
    street(v) {
      const rand = rng(7), gy = 74;
      let s = sky(rand, "#090e1d", "#0d1430", "#141d3b") + moon(134, 8) + bitClouds(rand, 3, "#3f9a68");
      // дальний силуэт
      for (let x = 0; x < W; x += 10) s += R(x, gy - 34 - Math.floor(rand() * 14), 10, 50, "#0f1726");
      const houses = [[2, 22, 40], [26, 18, 30], [46, 24, 46], [72, 16, 34], [90, 26, 52], [118, 18, 38], [138, 22, 44]];
      const lit = v === "dark" ? 0.12 : 0.55;
      houses.forEach(([x, w, h], i) => { s += house(rand, x, w, h, i % 2 ? "#1a2620" : "#1f2c34", lit, gy); });
      // мачта Wi-Fi с красным огоньком
      s += R(97, gy - 64, 1, 12, "#3a4a42") + R(96, gy - 65, 3, 1, "#ff6b6b", anim(rand, "st-blink", 1.5, 0.5));
      if (v === "translator" || v === "broken") {
        const ok = v === "translator";
        s += R(64, 38, 32, 36, "#22303a") + R(64, 38, 32, 1, "#3d5363") + R(66, 42, 28, 14, "#05140c") +
          R(66, 42, 28, 1, "#2f7a50") + R(70, 31, 2, 7, "#3a4a42") + R(88, 31, 2, 7, "#3a4a42") +
          R(67, 28, 26, 4, "#e0a458") + T(69, 31.4, "ПЕРЕВОДЧИК", 3.1, "#1a1208");
        s += ok
          ? T(70, 51, "А Б В", 6, "#5cf29a", 'class="st-blink-slow"')
          : T(68, 47.5, "0101 1110", 3.6, "#ff6b6b", 'class="st-jitter"') + T(68, 53.5, "1000 0110", 3.6, "#ff6b6b", 'class="st-jitter"');
        for (let i = 0; i < 4; i++) s += R(68 + i * 7, 60, 4, 2, i % 2 ? "#5cf29a" : "#e0a458", anim(rand, "st-blink", 1, 2));
        s += R(66, 66, 28, 6, "#17211c");
      }
      s += R(0, gy, W, 2, "#2a3b32") + pcbGround(rand, gy + 2, "#0d1411", "#4a3820");
      s += lamp(20, gy + 2) + lamp(116, gy + 2) + lamp(150, gy + 2);
      return s;
    },

    // Квартал Процессорной башни. Варианты: hot (разогнана, дымит)
    tower(v) {
      const rand = rng(11), hot = v === "hot", gy = 72;
      let s = hot ? sky(rand, "#1a0b12", "#2a1018", "#3a1a14") : sky(rand, "#090e1d", "#0d1430", "#141d3b");
      s += bitClouds(rand, 2, hot ? "#a0523a" : "#3f9a68");
      // соседние корпуса с лампочками
      [[4, 26, 36], [128, 28, 42]].forEach(([x, w, h]) => {
        s += R(x, gy - h, w, h, "#18221e");
        for (let y = gy - h + 4; y < gy - 2; y += 5)
          for (let lx = x + 3; lx < x + w - 2; lx += 5)
            s += R(lx, y, 2, 1, pick(rand, ["#5cf29a", "#6cc7ff", "#ffe066"]), anim(rand, "st-blink", 0.8, 2.5));
      });
      if (hot) s += `<rect x="40" y="0" width="80" height="${gy}" fill="#ff6b3a" class="st-glow"/>`;
      // радиатор и вентилятор
      for (let i = 0; i < 11; i++) s += R(56 + i * 4, 14, 2, 22, "#8d9aa3") ;
      s += R(54, 34, 52, 3, "#6b7880") + R(54, 12, 52, 2, "#6b7880");
      s += R(71, 15, 18, 18, "#1a1d24") + R(72, 16, 16, 16, "#262b36");
      s += `<g class="${hot ? "st-spin st-fast" : "st-spin"}" style="transform-origin:80px 24px">` +
        R(79, 17, 2, 6, "#9bb0a4") + R(79, 25, 2, 6, "#9bb0a4") + R(73, 23, 6, 2, "#9bb0a4") + R(81, 23, 6, 2, "#9bb0a4") +
        R(78, 22, 4, 4, "#3a4a42") + "</g>";
      // сам процессор
      s += R(56, 37, 48, 35, "#262b36") + R(56, 37, 48, 1, "#3d4456");
      for (let y = 40; y < 70; y += 4) s += R(52, y, 4, 1, "#e0a458") + R(104, y, 4, 1, "#e0a458");
      s += R(66, 44, 28, 20, hot ? "#5a2a24" : "#3a4152") + T(70.5, 57, "CPU", 8, hot ? "#ffb08a" : "#e0a458");
      s += R(58, 39, 2, 2, hot ? "#ff6b6b" : "#5cf29a", anim(rand, "st-blink", hot ? 0.4 : 2, 0.5));
      // градусник
      const lvl = hot ? 30 : 9;
      s += R(118, 30, 6, 38, "#1d2a23") + R(119, 31, 4, 36, "#0a0f0c") + R(119, 67 - lvl, 4, lvl, hot ? "#ff6b6b" : "#5cf29a", hot ? 'class="st-blink-slow"' : "") +
        R(117, 66, 8, 5, hot ? "#ff6b6b" : "#5cf29a") + T(114, 28, hot ? "105°" : "45°", 4, hot ? "#ff6b6b" : "#9bb0a4");
      if (hot) for (let i = 0; i < 5; i++) {
        const x = 58 + i * 10;
        s += `<g class="st-heat" style="animation-delay:-${(i * 0.37).toFixed(2)}s">` + R(x, 8, 1, 2, "#ffb08a") + R(x + 1, 6, 1, 2, "#ffb08a") + R(x, 4, 1, 2, "#ffb08a") + "</g>";
      }
      s += pcbGround(rand, gy, "#0f2a1c", "#7a5a30") + R(0, gy, W, 1, "#2f7a50");
      return s;
    },

    // Серверная с мигающими лампочками. Варианты: alarm (всё красное)
    servers(v) {
      const rand = rng(23), alarm = v === "alarm", gy = 72;
      let s = R(0, 0, W, H, "#0c1210") + R(0, 0, W, 9, "#141c18");
      for (let x = 0; x < W; x += 16) s += R(x, 0, 1, gy, "#111915");
      // кабельный лоток
      s += R(0, 5, W, 2, "#2a3b32");
      ["#6cc7ff", "#e0a458", "#5cf29a", "#ff8fa3"].forEach((c, i) => { for (let x = 4 + i * 9; x < W; x += 38) s += R(x, 7, 1, 6 + i, c); });
      [6, 38, 70, 102, 134].forEach((x) => {
        s += R(x, 14, 22, gy - 14, "#1b2320") + R(x, 14, 22, 1, "#33463d") + R(x, 14, 1, gy - 14, "#2a3b32") + R(x + 21, 14, 1, gy - 14, "#0a0f0c");
        for (let y = 17; y < gy - 3; y += 5) {
          s += R(x + 2, y, 18, 4, "#232e2a") + R(x + 3, y + 1, 9, 1, "#0f1512") + R(x + 3, y + 2, 9, 1, "#0f1512");
          const cols = alarm ? ["#ff6b6b", "#ff6b6b", "#ffe066"] : ["#5cf29a", "#5cf29a", "#6cc7ff", "#ffe066"];
          s += R(x + 15, y + 1, 1, 1, pick(rand, cols), anim(rand, "st-blink", alarm ? 0.3 : 0.6, alarm ? 0.4 : 2.4));
          s += R(x + 17, y + 1, 1, 1, pick(rand, cols), anim(rand, "st-blink", alarm ? 0.3 : 0.6, alarm ? 0.4 : 2.4));
        }
      });
      s += R(0, gy, W, H - gy, "#141c18");
      for (let x = 0; x < W; x += 12) s += R(x, gy, 1, H - gy, "#202c26");
      s += R(0, gy, W, 1, "#2a3b32") + R(0, gy + 9, W, 1, "#202c26");
      return s;
    },

    // Рынок оперативной памяти: прилавки в виде планок RAM. Варианты: forget (всё забыли)
    ram(v) {
      const rand = rng(31), forget = v === "forget", gy = 74;
      let s = sky(rand, "#090e1d", "#0d1430", "#141d3b") + bitClouds(rand, 2, "#3f9a68");
      for (let x = 0; x < W; x += 12) s += R(x, gy - 30 - Math.floor(rand() * 12), 12, 50, "#0f1726");
      // гирлянда
      for (let x = 2; x < W; x += 6) s += R(x, 14 + Math.round(Math.sin(x / 12) * 2), 2, 2, pick(rand, ["#ffe066", "#ff8fa3", "#6cc7ff", "#5cf29a"]), anim(rand, "st-blink", 1, 3));
      const labels = ["8 ГБ", "16 ГБ", "32 ГБ"];
      [6, 58, 110].forEach((x, i) => {
        // навес
        s += R(x + 2, 28, 1, 22, "#3a4a42") + R(x + 41, 28, 1, 22, "#3a4a42");
        for (let k = 0; k < 11; k++) s += R(x + k * 4, 24, 4, 5, k % 2 ? "#fff4e0" : i === 1 ? "#6cc7ff" : "#e0a458");
        s += R(x + 14, 32, 16, 6, "#17211c") + T(x + 15.5, 36.6, forget ? "? ГБ" : labels[i], 3.6, forget ? "#ff6b6b" : "#ffe066");
        // планка-прилавок
        s += R(x, 50, 44, 16, "#1f6b3e") + R(x, 50, 44, 1, "#2f8f55");
        for (let c = 0; c < 5; c++) {
          s += R(x + 3 + c * 8, 53, 6, 7, "#14161c") + R(x + 3 + c * 8, 53, 6, 1, "#2a2d35");
          if (forget) s += T(x + 4.4 + c * 8, 59, "?", 5, "#fff4e0", 'class="st-blink-slow"');
        }
        for (let p = 1; p < 43; p += 2) if (p < 19 || p > 22) s += R(x + p, 64, 1, 2, "#e0a458");
        s += R(x + 20, 62, 2, 4, "#0d1411");
      });
      s += R(0, gy, W, 2, "#2a3b32") + pcbGround(rand, gy + 2, "#0d1411", "#4a3820");
      return s;
    },

    // Склад дисков. Варианты: wrong (огромный HDD крутится не туда и стучит)
    warehouse(v) {
      const rand = rng(41), wrong = v === "wrong", gy = 74;
      let s = R(0, 0, W, H, "#151b20");
      for (let x = 0; x < W; x += 20) s += R(x, 0, 1, gy, "#1d252c");
      for (let y = 10; y < gy; y += 16) s += R(0, y, W, 1, "#1b2228");
      s += R(30, 2, 100, 3, "#20282f") + R(76, 5, 8, 2, wrong ? "#ff6b6b" : "#ffe066", wrong ? anim(rand, "st-blink", 0.3, 0.3) : "");
      // полки слева и справа
      [[2, 46], [114, 44]].forEach(([x, w]) => {
        [30, 50, 70].forEach((y) => {
          s += R(x, y, w, 2, "#6b4a26") + R(x, y + 2, w, 1, "#3a2814");
          let ix = x + 1;
          while (ix < x + w - 8) {
            const t = rand();
            if (t < 0.4) { s += R(ix, y - 9, 9, 9, "#8d96a0") + R(ix + 2, y - 7, 5, 5, "#5f6870") + R(ix + 4, y - 5, 1, 1, "#c9d1d9"); ix += 10; }
            else if (t < 0.75) { s += R(ix, y - 5, 10, 5, "#1f3a2c") + R(ix + 2, y - 4, 3, 3, "#14161c") + R(ix + 6, y - 4, 3, 3, "#14161c"); ix += 11; }
            else { s += R(ix, y - 7, 7, 7, "#3a5a9a") + R(ix + 2, y - 7, 3, 3, "#c9d1d9") + R(ix + 1, y - 3, 5, 3, "#d8dde3"); ix += 8; }
          }
        });
      });
      // большой открытый HDD
      s += R(54, 20, 54, 52, "#5f6870") + R(55, 21, 52, 50, "#3a4148");
      let disc = "";
      const cx = 78, cy = 46, rr = 19;
      for (let y = -rr; y <= rr; y++) {
        const hw = Math.floor(Math.sqrt(rr * rr - y * y));
        disc += R(cx - hw, cy + y, hw * 2, 1, Math.abs(y) % 6 === 0 ? "#b3bcc5" : "#c9d1d9");
      }
      s += disc + R(cx - 3, cy - 3, 6, 6, "#8d96a0") + R(cx - 1, cy - 1, 2, 2, "#3a4148");
      s += `<g class="st-spin ${wrong ? "st-rev st-wobble" : "st-slow"}" style="transform-origin:${cx}px ${cy}px">` +
        R(cx + 4, cy - 1, 14, 2, "#eef2f5") + R(cx - 17, cy, 10, 1, "#9aa3ad") + "</g>";
      s += `<g class="${wrong ? "st-jitter" : ""}"><polygon points="103,26 106,29 86,44 84,42" fill="#e0a458"/>` + R(101, 24, 6, 6, "#8d96a0") + "</g>";
      s += T(57, 69, "HDD 7200", 3.4, "#c9d1d9");
      s += R(0, gy, W, H - gy, "#20262b") + R(0, gy, W, 1, "#3a434b");
      for (let x = 6; x < W; x += 22) s += R(x, gy + 6, 10, 1, "#ffe066", 'opacity=".35"');
      return s;
    },

    // Внутри монитора: огромная сетка пикселей. Варианты: broken (мёртвые пиксели), rgb (лупа на пиксель)
    monitor(v) {
      const rand = rng(53), broken = v === "broken";
      let s = R(0, 0, W, H, "#050607");
      for (let cy = 0; cy < 18; cy++) {
        for (let cx = 0; cx < 32; cx++) {
          let c;
          const hill = 11 + Math.sin(cx / 4) * 1.6 + Math.sin(cx / 9) * 1.2;
          const sun = (cx - 6) * (cx - 6) + (cy - 4) * (cy - 4) < 7;
          if (sun) c = "#ffe066";
          else if (cy > 14) c = cy % 2 ? "#2b5a2f" : "#2f6334";
          else if (cy > hill) c = cy > hill + 2 ? "#3f8f4a" : "#5cbf5a";
          else c = ["#2c4f9a", "#3460b0", "#3d70c4", "#4a82d4", "#5a94e0", "#6aa6ea", "#7ab6f0", "#86c0f2", "#92caf4", "#9ed2f6", "#a8d8f8", "#b2def8", "#bce2f8", "#c4e6fa", "#c4e6fa"][cy];
          let a = "";
          if (broken) {
            const g = 70 + Math.floor(rand() * 50);
            c = `rgb(${g},${g},${g + 6})`;
            const t = rand();
            if (t < 0.22) c = "#000";
            else if (t < 0.25) { c = "#ff3b3b"; a = 'class="st-blink-slow"'; }
          } else if (rand() < 0.03) a = anim(rand, "st-shimmer", 2, 3);
          s += R(cx * 5, cy * 5, 4, 4, c, a);
        }
      }
      if (v === "rgb") {
        s += R(112, 6, 42, 34, "#0a0a0a") + R(113, 7, 40, 32, "#fff4e0") + R(114, 8, 38, 30, "#0a0a0a");
        s += R(117, 10, 9, 22, "#ff3b3b") + R(129, 10, 9, 22, "#3bff6b") + R(141, 10, 9, 22, "#3b7bff");
        s += T(119.5, 37, "R", 4, "#ff8a8a") + T(131.5, 37, "G", 4, "#8affa8") + T(143.5, 37, "B", 4, "#8ab0ff");
      }
      return s;
    },

    // Загрузочный экран. Для крючка на следующий месяц.
    boot() {
      let s = R(0, 0, W, H, "#000");
      const lines = ["Памятьвиль BIOS v1.0", "Проверка памяти ... 16384 МБ  OK", "Диски ............ OK", "Видеокарта ....... OK", "Процессорск ...... НЕТ СВЯЗИ"];
      lines.forEach((l, i) => { s += T(8, 17 + i * 7, l, 4, i === 4 ? "#ff6b6b" : "#c9d1d9", i === 4 ? 'class="st-blink-slow"' : ""); });
      s += T(8, 58, "Press DEL to enter SETUP", 4, "#ffe066") + R(8, 62, 3, 1, "#c9d1d9", 'class="st-blink"');
      // из темноты кто-то смотрит
      s += `<g class="st-blink-slow">` + R(136, 76, 3, 2, "#ff6b6b") + R(145, 76, 3, 2, "#ff6b6b") + "</g>";
      return s;
    },
  };

  function bgSVG(spec) {
    const [name, variant] = String(spec || "street").split(":");
    const fn = BG[name] || BG.street;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${fn(variant || "")}</svg>`;
  }

  // ---------- плеер ----------
  const ONESHOT = ["jump", "shake", "bounce", "float", "spin", "pop"];

  function Player(root, id, story) {
    const cast = Object.assign({}, CAST, story.cast || {});
    const beats = story.beats || [];
    const last = beats.length - 1;
    root.classList.add("story-on");
    root.innerHTML = `
      <div class="st-stage" tabindex="0" role="group" aria-roledescription="сценка" aria-label="${esc(story.title || "Сценка")}">
        <div class="st-world"><div class="st-bg"></div><div class="st-actors"></div><div class="st-fx"></div></div>
        <div class="st-sign" hidden></div>
        <div class="st-mood"></div><div class="st-flash"></div>
        <span class="st-count" aria-hidden="true"></span>
        <div class="st-cover">
          <p class="st-kicker">Сценка</p>
          <p class="st-title">${esc(story.title || "")}</p>
          <button type="button" class="btn st-play">Смотреть</button>
          <p class="st-seen" hidden>Уже смотрели. Можно ещё раз.</p>
        </div>
      </div>
      <div class="st-box" hidden>
        <div class="st-live sr-only" aria-live="polite"></div>
        <span class="st-who" aria-hidden="true"></span>
        <p class="st-text" aria-hidden="true"><span class="st-ghost"></span><span class="st-typed"></span></p>
        <div class="st-foot">
          <button type="button" class="st-skip">Пропустить</button>
          <span class="st-hint">Нажми, чтобы продолжить</span>
          <button type="button" class="btn ghost st-again" hidden>Ещё раз</button>
        </div>
      </div>`;
    const $ = (s) => root.querySelector(s);
    const stage = $(".st-stage"), world = $(".st-world"), bgEl = $(".st-bg"), actorsEl = $(".st-actors"), fxEl = $(".st-fx");
    const signEl = $(".st-sign"), moodEl = $(".st-mood"), flashEl = $(".st-flash"), countEl = $(".st-count");
    const skipBtn = $(".st-skip"), cover = $(".st-cover"), box = $(".st-box"), whoEl = $(".st-who");
    const ghost = $(".st-ghost"), typed = $(".st-typed"), live = $(".st-live"), hint = $(".st-hint"), again = $(".st-again");

    let st, idx = -1, playing = false, gen = 0, typing = null, autoTimer = null, bgSpec = null;
    const views = {};

    function fresh() { return { bg: null, mood: null, sign: null, actors: {}, shots: [], zoom: null, fx: [] }; }
    function actor(id) {
      if (!st.actors[id]) {
        const c = cast[id] || {};
        st.actors[id] = { x: c.x != null ? c.x : 50, y: GROUND, sprite: c.sprite || id, face: 1, visible: false, idle: c.idle || null };
      }
      return st.actors[id];
    }

    // Применяем кадр к состоянию (без DOM).
    function apply(b) {
      st.shots = []; st.zoom = null; st.fx = [];
      if (b.bg) st.bg = b.bg;
      if ("mood" in b) st.mood = b.mood;
      if ("sign" in b) st.sign = b.sign;
      for (const id in b.show || {}) {
        const a = actor(id), o = b.show[id] || {};
        Object.assign(a, o); a.visible = o.hide ? false : true; a.enterFrom = a.exitTo = null;
      }
      let list = b.do || [];
      if (typeof list === "string") list = list.split(";");
      list.map((s) => (Array.isArray(s) ? s : s.trim().split(/\s+/))).forEach(([id, verb, arg, arg2]) => {
        if (!id || !verb) return;
        const a = actor(id);
        const side = (x) => (x === "right" ? 120 : -20);
        if (verb === "enter") {
          a.enterFrom = side(arg || (a.x > 50 ? "right" : "left"));
          if (arg2 != null && !isNaN(arg2)) a.x = Number(arg2);
          else if (!isNaN(arg)) a.x = Number(arg);
          a.visible = true; a.exitTo = null;
        } else if (verb === "exit") { a.exitTo = side(arg || (a.x > 50 ? "right" : "left")); a.visible = false; }
        else if (verb === "move" || verb === "to") { a.x = Number(arg); a.walk = true; }
        else if (verb === "flip") { a.face *= -1; }
        else if (verb === "face") { a.face = arg === "left" ? -1 : 1; }
        else if (verb === "as" || verb === "emo") { a.sprite = arg; st.shots.push([id, "pop"]); }
        else if (verb === "hide") { a.visible = false; a.exitTo = null; }
        else if (verb === "show") { a.visible = true; }
        else if (ONESHOT.includes(verb)) st.shots.push([id, verb]);
      });
      let fx = b.fx || [];
      if (typeof fx === "string") fx = fx.split(/\s+/).filter(Boolean);
      fx.forEach((f) => {
        const [name, target] = f.split(":");
        if (name === "zoom") st.zoom = target || "50"; else st.fx.push([name, target]);
      });
    }

    function xOf(target) {
      if (target == null || target === "") return 50;
      if (st.actors[target]) return st.actors[target].x;
      const n = Number(target);
      return isNaN(n) ? 50 : n;
    }

    function viewFor(id) {
      if (views[id]) return views[id];
      const el = document.createElement("div");
      el.className = "st-actor";
      el.hidden = true;
      el.innerHTML = '<div class="st-a-act"><div class="st-a-idle"><div class="st-a-face"></div></div></div>';
      actorsEl.append(el);
      const v = { el, act: el.firstChild, idle: el.firstChild.firstChild, face: el.firstChild.firstChild.firstChild, key: "" };
      el.addEventListener("transitionend", (e) => { if (e.propertyName === "left") el.classList.remove("walking"); });
      v.act.addEventListener("animationend", () => { v.act.className = "st-a-act"; });
      return (views[id] = v);
    }

    function render(animate) {
      const myGen = gen;
      if (st.bg !== bgSpec) { bgSpec = st.bg; bgEl.innerHTML = bgSVG(st.bg); }
      moodEl.className = "st-mood" + (st.mood ? " mood-" + st.mood : "");
      if (st.sign) { signEl.hidden = false; signEl.textContent = st.sign; } else signEl.hidden = true;

      for (const id in st.actors) {
        const a = st.actors[id], v = viewFor(id), el = v.el;
        const res = resolve(id, a.sprite, cast);
        const key = res.name + "|" + res.filter;
        if (v.key !== key) {
          v.key = key;
          const size = spriteSize(res.name);
          const scale = (cast[id] && cast[id].scale) || 1.7;
          el.style.width = ((size.w * scale) / W) * 100 + "%";
          v.face.style.aspectRatio = size.w + " / " + size.h;
          v.face.innerHTML = res.name ? window.Pixel.toSVG(res.name) : '<div class="st-noart"></div>';
          v.face.style.filter = res.filter || "";
        }
        v.face.style.transform = "scaleX(" + (a.face < 0 ? -1 : 1) + ")";
        v.idle.className = "st-a-idle" + (a.idle ? " idle-" + a.idle : "");
        el.style.bottom = (a.y != null ? a.y : GROUND) + "%";
        el.style.zIndex = String(10 + Math.round(100 - (a.y || 0)));
        const was = !el.hidden;
        if (animate && a.enterFrom != null) {
          el.classList.add("no-tr");
          el.style.left = a.enterFrom + "%";
          el.hidden = false;
          void el.offsetWidth;
          el.classList.remove("no-tr");
          el.classList.add("walking");
        }
        if (a.visible) {
          if (animate && a.walk && was) el.classList.add("walking");
          el.hidden = false;
          el.style.left = a.x + "%";
        } else if (animate && a.exitTo != null && was) {
          el.classList.add("walking");
          el.style.left = a.exitTo + "%";
          setTimeout(() => { if (myGen === gen && !st.actors[id].visible) el.hidden = true; }, 900);
        } else el.hidden = true;
        if (!animate) { el.classList.add("no-tr"); el.classList.remove("walking"); void el.offsetWidth; el.classList.remove("no-tr"); }
        a.enterFrom = a.exitTo = null; a.walk = false;
      }

      if (animate) {
        st.shots.forEach(([id, verb]) => {
          const v = views[id];
          if (!v) return;
          v.act.className = "st-a-act";
          void v.act.offsetWidth;
          v.act.className = "st-a-act act-" + verb;
        });
      }

      if (st.zoom != null) {
        world.style.transformOrigin = xOf(st.zoom) + "% 70%";
        world.classList.add("zoomed");
      } else world.classList.remove("zoomed");

      if (animate) st.fx.forEach(([name, target]) => effect(name, target));
    }

    // ---------- эффекты ----------
    // Класс эффекта снимается сам, чтобы следующий кадр был чистым.
    const fxTimers = {};
    function restart(el, cls, ms) {
      el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
      clearTimeout(fxTimers[cls]);
      fxTimers[cls] = setTimeout(() => el.classList.remove(cls), ms);
    }
    function particles(make, n, life) {
      const myGen = gen;
      const frag = document.createDocumentFragment(), made = [];
      for (let i = 0; i < n; i++) { const p = make(i); frag.append(p); made.push(p); }
      fxEl.append(frag);
      setTimeout(() => { if (myGen === gen) made.forEach((p) => p.remove()); }, life);
    }
    function effect(name, target) {
      const calm = reduced();
      if (name === "shake") { if (!calm) restart(stage, "fx-shake", 600); }
      else if (name === "flash") restart(flashEl, calm ? "on-soft" : "on", 900);
      else if (name === "glitch") restart(stage, calm ? "fx-tint" : "fx-glitch", 900);
      else if (calm) return;
      else if (name === "bits") particles(() => {
        const p = document.createElement("span");
        p.className = "st-p st-bitp";
        p.textContent = Math.random() < 0.5 ? "0" : "1";
        p.style.left = Math.random() * 98 + "%";
        p.style.animationDuration = (1.6 + Math.random() * 1.6).toFixed(2) + "s";
        p.style.animationDelay = (Math.random() * 1.2).toFixed(2) + "s";
        return p;
      }, 34, 4200);
      else if (name === "confetti") particles((i) => {
        const p = document.createElement("span");
        p.className = "st-p st-conf";
        p.style.left = Math.random() * 100 + "%";
        p.style.background = ["#ffe066", "#5cf29a", "#6cc7ff", "#ff8fa3", "#e0a458", "#ff6b6b"][i % 6];
        p.style.animationDuration = (1.8 + Math.random() * 1.6).toFixed(2) + "s";
        p.style.animationDelay = (Math.random() * 0.8).toFixed(2) + "s";
        p.style.setProperty("--dx", (Math.random() * 40 - 20).toFixed(0) + "px");
        return p;
      }, 46, 4000);
      else if (name === "smoke") {
        const x = xOf(target);
        particles(() => {
          const p = document.createElement("span");
          p.className = "st-p st-smoke";
          p.style.left = x - 6 + Math.random() * 12 + "%";
          p.style.bottom = (st.actors[target] ? GROUND + 12 : 40) + Math.random() * 6 + "%";
          p.style.animationDuration = (1.8 + Math.random() * 1.4).toFixed(2) + "s";
          p.style.animationDelay = (Math.random() * 1.4).toFixed(2) + "s";
          p.style.setProperty("--dx", (Math.random() * 30 - 15).toFixed(0) + "px");
          return p;
        }, 18, 4600);
      }
    }

    // ---------- текст ----------
    function speech(b, instant) {
      clearTimeout(typing);
      typing = null;
      Object.values(views).forEach((v) => v.el.classList.remove("talking"));
      const text = b.say || "";
      const who = b.who || "";
      const name = b.name || (cast[who] ? cast[who].name : who);
      box.classList.toggle("narr", !who);
      whoEl.textContent = name;
      whoEl.hidden = !name;
      live.textContent = (name ? name + ": " : "") + text;
      ghost.textContent = text;
      const a = st.actors[who];
      if (a && a.visible && !st.zoom) { box.style.setProperty("--tail", Math.min(92, Math.max(8, a.x)) + "%"); box.classList.add("tail"); }
      else box.classList.remove("tail");
      const chars = Array.from(text);
      if (instant || reduced() || !chars.length) { typed.textContent = text; return; }
      const v = views[who];
      if (v) v.el.classList.add("talking");
      let i = 0;
      typed.textContent = "";
      const step = () => {
        i++;
        typed.textContent = chars.slice(0, i).join("");
        if (i >= chars.length) { typing = null; if (v) v.el.classList.remove("talking"); return; }
        const ch = chars[i - 1];
        typing = setTimeout(step, /[.!?…]/.test(ch) ? 260 : /[,:;]/.test(ch) ? 120 : 24);
      };
      typing = setTimeout(step, 120);
    }
    function finishTyping() {
      if (!typing) return false;
      clearTimeout(typing);
      typing = null;
      typed.textContent = ghost.textContent;
      Object.values(views).forEach((v) => v.el.classList.remove("talking"));
      return true;
    }

    // ---------- навигация ----------
    function go(i, animate) {
      clearTimeout(autoTimer);
      idx = i;
      const b = beats[i];
      fxEl.textContent = "";
      apply(b);
      render(animate);
      speech(b, !animate);
      countEl.textContent = i + 1 + " / " + beats.length;
      const end = i === last;
      again.hidden = !end;
      hint.hidden = end;
      skipBtn.hidden = end;
      root.classList.toggle("st-end", end);
      if (end) store(SEEN + id, "1");
      else if (b.wait && !b.say) autoTimer = setTimeout(() => go(i + 1, !reduced()), b.wait);
    }
    function reset() {
      gen++;
      clearTimeout(typing); typing = null; clearTimeout(autoTimer);
      st = fresh(); bgSpec = null;
      for (const k in views) { views[k].el.remove(); delete views[k]; }
      fxEl.textContent = "";
      world.classList.remove("zoomed");
    }
    function start() {
      reset();
      playing = true;
      cover.hidden = true;
      box.hidden = false;
      root.classList.add("st-playing");
      go(0, !reduced());
      stage.focus({ preventScroll: true });
    }
    function next() {
      if (!playing) return;
      if (finishTyping()) return;
      if (idx < last) go(idx + 1, !reduced());
    }
    function skip() {
      reset();
      for (let i = 0; i < last; i++) apply(beats[i]);
      go(last, false);
      again.focus({ preventScroll: true });
    }

    $(".st-play").addEventListener("click", (e) => { e.stopPropagation(); start(); });
    skipBtn.addEventListener("click", (e) => { e.stopPropagation(); skip(); });
    again.addEventListener("click", (e) => { e.stopPropagation(); start(); });
    stage.addEventListener("click", next);
    box.addEventListener("click", next);
    root.addEventListener("keydown", (e) => {
      if (e.key !== " " && e.key !== "Enter") return;
      if (e.target.closest("button")) return;
      if (!playing) { if (e.target === stage) { e.preventDefault(); start(); } return; }
      e.preventDefault();
      next();
    });

    // Обложка: фон первого кадра.
    st = fresh();
    const firstBg = (beats.find((b) => b.bg) || {}).bg || "street";
    bgEl.innerHTML = bgSVG(firstBg);
    if (store(SEEN + id) === "1") { $(".st-seen").hidden = false; $(".st-play").textContent = "Смотреть ещё раз"; }
    countEl.textContent = beats.length + " " + plural(beats.length, "кадр", "кадра", "кадров");
  }

  function plural(n, one, few, many) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }

  function mount(rootEl) {
    (rootEl || document).querySelectorAll(".story[data-story]").forEach((el) => {
      if (el.dataset.storyMounted) return;
      const id = el.dataset.story;
      const story = STORIES[id];
      if (!story || !story.beats || !story.beats.length) return;
      el.dataset.storyMounted = "1";
      Player(el, id, story);
    });
  }

  window.Story = { mount, CAST, BG: Object.keys(BG), seen: (id) => store(SEEN + id) === "1" };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mount());
  else mount();
})();
