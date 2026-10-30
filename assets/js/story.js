// Комикс-серии Памятьвиля: маленький плеер пиксельных серий со звуком, без библиотек.
//
// В странице: <div class="story" data-story="l03-intro"></div>
// Сценка:     window.STORIES["l03-intro"] = { title: "...", beats: [ ... ] }
//
// Кадр (beat) может содержать:
//   bg:    "street" | "street:translator" | "tower:hot" | ... (фон, вариант после двоеточия)
//   mood:  "hot" | "alarm" | "dark" | "glitch" | null (цветная подсветка поверх сцены)
//   sign:  "01000010 = B" | null                     (табличка с текстом сверху)
//   show:  { bit: { x: 30, sprite: "bitHappy", face: -1 } }  (поставить сразу)
//   do:    "bit enter left 30; glitch shake; mega as megaHappy"     (действия)
//          enter left|right [x], exit left|right, move x, jump, shake, bounce,
//          float, flip, face left|right, as <спрайт>, hide
//   who:   "bit" (говорит персонаж) или любой текст-имя; без who это подпись рассказчика
//   name:  "Глюк (из динамика)" (другое имя над репликой)
//   say:   "Текст реплики"
//   fx:    "shake flash glitch bits confetti smoke:70 smoke:bit zoom:bit"
//   sfx:   "alarm" | "boot beep" (необязательно: свои звуки поверх автоматических, см. SFX ниже)
//   tone:  "think" | "shout" | "whisper"              (вид пузыря: мысль, крик, шёпот)
//   to:    "reader"  говорящий делает шаг к камере, смотрит прямо и обращается к ученику
//
// Выборы как в визуальной новелле (всё необязательно, старые сценки играют как раньше):
//   choice:   [{ label: "Да, зашло", go: "yes", value: "yes" }, ...]  кнопки в пузыре (или под подписью).
//             go: метка кадра, куда перейти (без go: следующий кадр). value: что запомнить (по умолчанию go).
//             «Дальше» и нажатие на картинку не работают, пока не выбрали. Клавиши 1-9, стрелки, Enter.
//   remember: "l04-liked"  запомнить ответ в localStorage «story-choices» (видят и другие сценки, уроки:
//             Story.choice("l04-liked")). Внутри своей сценки учитывается только ответ этого просмотра.
//   required: true   «Пропустить» остановится на этом вопросе. Без него пропуск идёт мимо, ничего не выбирая,
//   after:    "label" и тогда переходит на after (если его нет, то как обычно: goto или следующий кадр).
//   label:    "yes"   метка кадра для go/goto.
//   goto:     "end" | "label"  после этого кадра перейти к метке; неизвестная метка (например "end") = конец.
//   if:       { "l04-liked": "yes" }  показать кадр, только если ответ совпал. Значение: строка, массив строк,
//             "*" (ответ есть) или null (ответа нет). Неподходящие кадры пропускаются целиком.
//   «Назад» идёт по пройденному пути, через выбор тоже: вернулся к вопросу, можно ответить иначе.
//
// Сцена живёт в логических пикселях: ширина всегда 320, видимая высота 180 (1u = ширина / 320).
// Фон, герои и тени масштабируются вместе. Пузыри реплик живут в настоящих пикселях,
// чтобы текст оставался читаемым, а их место считается по положению говорящего.
//
// Спрайты: если есть window.HD_SPRITES[имя] (32 px в ширину), берём его, иначе 16 px спрайт
// из pixel.js, увеличенный в 2 раза. Моргание: HD-кадр <герой>Blink, иначе кадр строится сам.
(function () {
  "use strict";
  const STORIES = (window.STORIES = window.STORIES || {});
  const W = 320, H = 180;         // логическая сетка сцены: 320x180 видно всегда
  const TOP = -140;               // запас неба сверху: на узких экранах кадр квадратный и видно 320x320
  const SEEN = "story-seen-";
  const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const touchy = () => !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);

  // Актёры. scale: во сколько раз увеличить HD-пиксель (32 px спрайт). fallback: подкраска Бита, если арта нет.
  const CAST = {
    bit:    { name: "Бит", sprite: "bit", x: 34, scale: 1.3, color: "#f2a65a", voice: "bit" },
    nibble: { name: "Нибл", sprite: "nibble", x: 14, scale: 1.1, color: "#ff8fd8", voice: "nibble", fallback: "grayscale(1) brightness(1.6)" },
    mega:   { name: "Дедушка Мега", sprite: "mega", x: 58, scale: 1.3, color: "#c9ced8", voice: "mega", fallback: "grayscale(1) brightness(1.1)" },
    glitch: { name: "Глюк", sprite: "glitch", x: 82, scale: 1.35, color: "#c58bff", voice: "glitch", idle: "float", fallback: "hue-rotate(250deg) saturate(2.2)" },
  };
  // Где у 16 px спрайтов глаза (строки, буквы палитры) и чем их закрыть при моргании.
  const EYES = {
    bit: { from: 6, to: 11, eyes: "g", fur: "o" },
    nibble: { from: 7, to: 10, eyes: "c", fur: "n" },
    mega: { from: 8, to: 11, eyes: "gc", fur: "e" },
    glitch: { from: 5, to: 8, eyes: "ry", fur: "v" },
  };
  // Линия земли (логические пиксели от верха кадра 0..180) для каждого фона.
  const GROUND = { street: 168, tower: 164, servers: 166, ram: 168, warehouse: 166, monitor: 172, boot: 172 };

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  // Ответы на выборы всех сценок: { "l04-liked": "yes", ... }
  const CHOICES = "story-choices";
  function loadChoices() {
    try { const o = JSON.parse(store(CHOICES) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; }
  }
  function saveChoice(k, v) { const all = loadChoices(); all[k] = v; store(CHOICES, JSON.stringify(all)); }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- спрайты ----------
  // Арт по имени: { rows, pal, k } где k: сколько логических пикселей на пиксель спрайта (HD 1, старый 2).
  function art(name) {
    if (!name) return null;
    const HD = window.HD_SPRITES, P = window.Pixel || {};
    const pal = Object.assign({}, P.PALETTE || {}, window.HD_PALETTE || {});
    const unpack = (s) => {
      const rows = Array.isArray(s) ? s : s && s.rows;
      if (!rows || !rows.length) return null;
      return s.mirror ? rows.map((r) => r + r.split("").reverse().join("")) : rows.slice();
    };
    if (HD && HD[name]) {
      const rows = unpack(HD[name]);
      if (rows) return { rows, pal: Object.assign({}, pal, HD[name].palette || {}), k: 32 / rows[0].length, hd: true };
    }
    const s = P.SPRITES && P.SPRITES[name];
    const rows = unpack(s);
    return rows ? { rows, pal, k: 32 / rows[0].length, hd: false } : null;
  }
  // Нужный спрайт → базовый спрайт героя → Бит (с подкраской). Страница не ломается никогда.
  function resolve(id, want, cast) {
    const c = cast[id] || {};
    if (art(want)) return { name: want, filter: "" };
    if (art(c.sprite)) return { name: c.sprite, filter: "" };
    return { name: art("bit") ? "bit" : null, filter: c.fallback || "" };
  }
  function svgOf(a, rows, cls) {
    let rects = "";
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === "." || ch === " " || !a.pal[ch]) continue;
        let run = 1;
        while (row[x + run] === ch) run++;
        rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${a.pal[ch]}"/>`;
        x += run - 1;
      }
    });
    return `<svg class="${cls}" viewBox="0 0 ${rows[0].length} ${rows.length}" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
  }
  // Кадр «глаза закрыты». HD: готовый кадр <герой>Blink (только для базового спрайта).
  // Старый 16 px: глаза закрашиваем шерстью, нижнюю строку глаз делаем чёрточкой.
  function blinkFrame(name, a) {
    const key = Object.keys(EYES).find((k) => name.startsWith(k));
    if (!key) return null;
    if (a.hd) {
      if (name !== key) return null;
      const b = art(key + "Blink");
      return b && b.hd && b.rows.length === a.rows.length ? b.rows : null;
    }
    const e = EYES[key], rows = a.rows;
    const out = rows.map((r) => r.split(""));
    let lastY = -1;
    for (let y = e.from; y <= Math.min(e.to, rows.length - 1); y++) {
      for (let x = 0; x < rows[y].length; x++) if (e.eyes.includes(rows[y][x])) { out[y][x] = e.fur; lastY = y; }
    }
    if (lastY < 0) return null;
    for (let x = 0; x < rows[lastY].length; x++) if (e.eyes.includes(rows[lastY][x])) out[lastY][x] = "k";
    return out.map((r) => r.join(""));
  }

  // ---------- звук (SFX) ----------
  // Всё синтезируется WebAudio прямо здесь, файлов нет, работает офлайн.
  // Звук включается только после первого нажатия (правило браузеров), выключатель помнится в localStorage.
  //   Голоса при печати: Бит: квадрат ~520 Гц; Нибл: треугольник ~880 Гц, прыгает;
  //   Мега: низкая пила ~170 Гц через фильтр; Глюк: квадрат со случайной высотой и хрипом;
  //   рассказчик: тихий синус ~330 Гц. Остальные голоса (по имени) получают средний тон.
  //   Листание: next/back шуршание страницы. Эффекты: glitch шумовой заик с «битовой» ступенькой,
  //   shake глухой удар, flash электрический «вжик», bits звёздочки, confetti фанфара, smoke шипение,
  //   zoom свист, enter/exit шаги (у Глюка свист), jump/bounce «боинг», смена эмоции короткий щелчок.
  //   Явные звуки для поля sfx: alarm, beep, boot, click, fanfare, thump, zap, whoosh, hiss, twinkle,
  //   glitch, steps, boing, hum, sad, hover, pick.
  const SFX = (function () {
    const KEY = "story-sound";
    let ctx = null, master = null, noiseBuf = null, crushCurve = null;
    let on = store(KEY) !== "0";
    let lastBlip = 0;
    function unlock() {
      if (!on) return null;
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.2;
          master.connect(ctx.destination);
        }
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
      } catch (e) { ctx = null; }
      return ctx;
    }
    const ready = () => (on && ctx && ctx.state !== "closed" ? ctx : null);
    function noise() {
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return noiseBuf;
    }
    function env(g, t, vol, att, dur) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + att);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    // тон: частота, длительность, форма, громкость, куда скользит, задержка
    function tone(f, dur, type, vol, to, delay, filt) {
      const c = ready(); if (!c) return;
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      env(g, t, vol || 0.2, 0.005, dur);
      let node = o;
      if (filt) { const bq = c.createBiquadFilter(); bq.type = "lowpass"; bq.frequency.value = filt; o.connect(bq); node = bq; }
      node.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    }
    // шум: длительность, тип фильтра, частота (и куда скользит), громкость, задержка, «битовая» ступенька
    function hiss(dur, type, f, to, vol, delay, crush) {
      const c = ready(); if (!c) return;
      const t = c.currentTime + (delay || 0);
      const s = c.createBufferSource(); s.buffer = noise();
      const bq = c.createBiquadFilter(); bq.type = type || "bandpass"; bq.frequency.setValueAtTime(f, t);
      if (to) bq.frequency.exponentialRampToValueAtTime(to, t + dur);
      const g = c.createGain(); env(g, t, vol || 0.2, 0.01, dur);
      let node = s;
      if (crush) {
        if (!crushCurve) { crushCurve = new Float32Array(256); for (let i = 0; i < 256; i++) crushCurve[i] = Math.round(((i / 128) - 1) * 3) / 3; }
        const ws = c.createWaveShaper(); ws.curve = crushCurve; s.connect(ws); node = ws;
      }
      node.connect(bq); bq.connect(g); g.connect(master);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    }
    const LIB = {
      click: () => tone(1400, 0.03, "square", 0.05),
      next: () => { hiss(0.14, "bandpass", 900, 3200, 0.1); tone(1300, 0.02, "square", 0.025, 0, 0.01); },
      back: () => { hiss(0.14, "bandpass", 3200, 900, 0.1); },
      thump: () => { tone(110, 0.3, "sine", 0.5, 38); hiss(0.18, "lowpass", 300, 80, 0.25); },
      zap: () => { tone(1900, 0.2, "sawtooth", 0.09, 140); hiss(0.08, "highpass", 4000, 0, 0.06); },
      glitch: () => {
        for (let i = 0; i < 7; i++) {
          const d = i * 0.055 + Math.random() * 0.02;
          if (i % 2) hiss(0.04, "bandpass", 600 + Math.random() * 3000, 0, 0.18, d, true);
          else tone(200 + Math.random() * 900, 0.035, "square", 0.07, 0, d);
        }
      },
      twinkle: () => { for (let i = 0; i < 6; i++) tone(1300 + Math.random() * 1400, 0.12, "sine", 0.06, 0, i * 0.08 + Math.random() * 0.03); },
      fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.12, "square", 0.06, 0, i * 0.1, 3000)); tone(1047 * 1.5, 0.3, "triangle", 0.04, 0, 0.32); },
      hiss: () => hiss(0.9, "highpass", 2500, 5000, 0.07),
      whoosh: () => hiss(0.45, "bandpass", 300, 2400, 0.16),
      steps: () => { for (let i = 0; i < 3; i++) hiss(0.05, "lowpass", 700, 0, 0.22, i * 0.13); },
      boing: () => tone(260, 0.22, "sine", 0.16, 760),
      pop: () => tone(700, 0.05, "triangle", 0.07, 1100),
      alarm: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 660 : 880, 0.18, "square", 0.05, 0, i * 0.19, 2500); },
      beep: () => tone(1000, 0.18, "square", 0.06, 0, 0, 3000),
      boot: () => { tone(1000, 0.12, "square", 0.06, 0, 0, 3000); tone(55, 0.8, "sawtooth", 0.08, 50, 0.15, 400); },
      hum: () => tone(60, 1.2, "sawtooth", 0.06, 58, 0, 300),
      sad: () => { [392, 370, 349, 311].forEach((f, i) => tone(f, 0.22, "triangle", 0.07, 0, i * 0.2)); },
      // выбор ответа: тихий тик при наведении и двойной «дзынь» при выборе
      hover: () => tone(2100, 0.018, "square", 0.018, 0, 0, 4000),
      pick: () => { tone(880, 0.06, "triangle", 0.07); tone(1320, 0.1, "triangle", 0.06, 0, 0.06); },
    };
    LIB.bits = LIB.twinkle; LIB.confetti = LIB.fanfare; LIB.smoke = LIB.hiss; LIB.zoom = LIB.whoosh;
    LIB.shake = LIB.thump; LIB.flash = LIB.zap; LIB.footsteps = LIB.steps; LIB.jump = LIB.boing;
    LIB.bounce = () => { tone(260, 0.16, "sine", 0.14, 700); tone(300, 0.14, "sine", 0.1, 700, 0.2); };
    // Голос при печати: одна «буковка» звука на пару символов.
    const VOICE = {
      bit: () => tone(500 + Math.random() * 60, 0.035, "square", 0.035, 0, 0, 2600),
      nibble: () => tone(840 + Math.random() * 200, 0.03, "triangle", 0.05),
      mega: () => tone(165 + Math.random() * 20, 0.06, "sawtooth", 0.05, 0, 0, 900),
      glitch: () => { tone(200 + Math.random() * 700, 0.03, "square", 0.03); if (Math.random() < 0.3) hiss(0.03, "bandpass", 2000, 0, 0.06, 0, true); },
      narrator: () => tone(330 + Math.random() * 20, 0.04, "sine", 0.03),
      other: () => tone(420 + Math.random() * 40, 0.04, "triangle", 0.035),
    };
    return {
      unlock,
      get on() { return on; },
      set(v) { on = !!v; store(KEY, on ? "1" : "0"); if (on) unlock(); else if (ctx && ctx.state === "running") ctx.suspend().catch(() => {}); },
      play(name) { try { if (ready() && LIB[name]) LIB[name](); } catch (e) { /* звук не обязателен */ } },
      blip(voice) {
        try {
          const c = ready(); if (!c) return;
          const now = c.currentTime;
          if (now - lastBlip < 0.045) return;
          lastBlip = now;
          (VOICE[voice] || VOICE.other)();
        } catch (e) { /* звук не обязателен */ }
      },
    };
  })();

  // ---------- фоны: пиксель-арт кодом, 320x180 логических пикселей ----------
  // Фон рисуется в «живых» цветах, а потом весь приглушается (shade): темнее и спокойнее героев,
  // чтобы персонажи всегда читались поверх локации.
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
  const C = (cx, cy, r, f, a) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${a ? " " + a : ""}/>`;
  const P = (pts, f, a) => `<polygon points="${pts}" fill="${f}"${a ? " " + a : ""}/>`;
  const anim = (rand, cls, min, spread) =>
    `class="${cls}" style="animation-delay:-${(rand() * 6).toFixed(2)}s;animation-duration:${(min + rand() * spread).toFixed(2)}s"`;
  const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
  const fl = Math.floor;

  // Узоры (дизеринг, сканлайны) живут в <defs> каждого фона с уникальным id.
  let DEFS = null, UID = "";
  function pat(kind, color) {
    const id = `${UID}-${kind}-${color.replace(/[^0-9a-z]/gi, "")}`;
    if (!DEFS[id]) {
      if (kind === "chk") DEFS[id] = `<pattern id="${id}" width="2" height="2" patternUnits="userSpaceOnUse">${R(0, 0, 1, 1, color)}${R(1, 1, 1, 1, color)}</pattern>`;
      else if (kind === "scan") DEFS[id] = `<pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse">${R(0, 2, 3, 1, color)}</pattern>`;
      else if (kind === "sub") DEFS[id] = `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse">${R(2, 0, 1, 8, color)}${R(5, 0, 1, 8, color)}</pattern>`;
      else if (kind === "glow") DEFS[id] = `<radialGradient id="${id}" cx="50%" cy="65%" r="55%"><stop offset="0" stop-color="${color}" stop-opacity="1"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
      else if (kind === "vent") DEFS[id] = `<pattern id="${id}" width="3" height="2" patternUnits="userSpaceOnUse">${R(0, 0, 2, 1, color)}</pattern>`;
    }
    return `url(#${id})`;
  }
  // Небо полосами с дизерингом на стыках.
  function sky(rand, cols, y0, y1, stars) {
    const step = (y1 - y0) / cols.length;
    let s = R(0, TOP, W, y0 - TOP + 1, cols[0]);
    cols.forEach((c, i) => { s += R(0, fl(y0 + i * step), W, Math.ceil(step) + 1, c); });
    cols.forEach((c, i) => { if (i) s += R(0, fl(y0 + i * step) - 3, W, 3, pat("chk", c)); });
    for (let i = 0; i < stars; i++) {
      const x = fl(rand() * W), y = TOP + fl(rand() * (y1 - 30 - TOP));
      if (rand() < 0.12) {
        const c = rand() < 0.5 ? "#fff4c9" : "#d6e2ff";
        s += `<g ${anim(rand, "st-twinkle", 2, 4)}>${R(x, y - 1, 1, 3, c)}${R(x - 1, y, 3, 1, c)}</g>`;
      } else s += R(x, y, 1, 1, rand() < 0.3 ? "#ffe9a8" : "#c9d6ff", rand() < 0.4 ? anim(rand, "st-twinkle", 2, 4) : 'opacity=".6"');
    }
    return s;
  }
  function bitClouds(rand, n, color) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const y = TOP + 18 + i * 26 + fl(rand() * 6);
      const txt = Array.from({ length: 3 }, () => fl(rand() * 16).toString(2).padStart(4, "0")).join(" ");
      s += `<g class="st-drift" style="animation-duration:${(40 + rand() * 30).toFixed(0)}s;animation-delay:-${(rand() * 60).toFixed(0)}s">${T(fl(rand() * 140), y, txt, 8, color, 'opacity=".75"')}</g>`;
    }
    return s;
  }
  function moon(cx, cy, r) {
    return C(cx, cy, r + 10, "#fff1b8", 'opacity=".05"') + C(cx, cy, r + 4, "#fff1b8", 'opacity=".07"') + C(cx, cy, r, "#f4e7b0") +
      C(cx - 3, cy - 2, 2.5, "#d9c98e") + C(cx + 3, cy + 3, 1.5, "#d9c98e") + C(cx + 2, cy - 4, 1, "#d9c98e");
  }
  // Медная «дорожка» платы: линия, повороты и переходные отверстия.
  function traces(rand, y0, y1, trace, via) {
    let s = "";
    for (let ty = y0 + 5; ty < y1 - 2; ty += 7) {
      let x = fl(rand() * 16);
      while (x < W) {
        const len = 14 + fl(rand() * 40);
        s += R(x, ty, len, 1, trace);
        if (rand() < 0.4 && ty + 4 < y1) s += R(x + len, ty, 1, 4, trace) + R(x + len, ty + 4, 8, 1, trace);
        s += R(x + len - 1, ty - 1, 3, 3, via) + R(x + len, ty, 1, 1, "#0a0d0c");
        x += len + 10 + fl(rand() * 18);
      }
    }
    return s;
  }
  // Дом с окнами в рамах, карнизом и мелочами на крыше. lit: доля горящих окон.
  function house(rand, x, w, h, cols, lit, gy) {
    const [base, side, trim] = cols, y = gy - h;
    let s = R(x, y, w, h, base) + R(x + w - 3, y, 3, h, side) + R(x - 1, y, w + 2, 3, trim) + R(x - 1, y + 3, w + 2, 1, "#0a0e12");
    for (let ly = y + 14; ly < gy - 6; ly += 12) s += R(x, ly, w - 3, 1, side, 'opacity=".5"');
    const r = rand();
    if (r < 0.3) s += R(x + 5, y - 10, 1, 10, "#2c3633") + R(x + 2, y - 8, 7, 1, "#2c3633") + R(x + 3, y - 5, 5, 1, "#2c3633");
    else if (r < 0.6) s += R(x + w - 16, y - 9, 9, 7, "#26302d") + R(x + w - 16, y - 9, 9, 1, "#3a4643") + R(x + w - 15, y - 2, 1, 2, "#26302d") + R(x + w - 9, y - 2, 1, 2, "#26302d");
    else s += R(x + 4, y - 5, 10, 5, "#232b29") + R(x + 5, y - 4, 8, 1, "#11171a") + R(x + 5, y - 2, 8, 1, "#11171a");
    for (let wy = y + 7; wy < gy - 14; wy += 12) {
      for (let wx = x + 4; wx < x + w - 8; wx += 9) {
        const on = rand() < lit;
        const col = on ? pick(rand, ["#ffe08a", "#ffe08a", "#f0b366", "#8fd0ff", "#fff1d6"]) : "#0a0f12";
        s += R(wx - 1, wy - 1, 7, 9, "#0d1215");
        s += R(wx, wy, 5, 7, col, on && rand() < 0.15 ? anim(rand, "st-blink", 3, 5) : "");
        if (on && rand() < 0.4) s += R(wx, wy, 2, 7, "#b07a3c", 'opacity=".55"');
        s += R(wx + 2, wy, 1, 7, "#0d1215") + R(wx, wy + 3, 5, 1, "#0d1215") + R(wx - 1, wy + 8, 7, 1, trim);
      }
    }
    if (w > 38) {
      const dx = x + fl(w / 2) - 5;
      s += R(dx - 1, gy - 15, 12, 15, trim) + R(dx, gy - 14, 10, 14, "#24190f") + R(dx + 2, gy - 12, 6, 4, "#f0b366", 'opacity=".8"') + R(dx + 7, gy - 7, 1, 1, "#e0a458");
    }
    return s;
  }
  function lamp(x, gy) {
    return P(`${x + 9},${gy - 41} ${x + 13},${gy - 41} ${x + 30},${gy} ${x - 8},${gy}`, "#ffe9a8", 'opacity=".06"') +
      `<ellipse cx="${x + 11}" cy="${gy + 3}" rx="22" ry="4" fill="#ffe9a8" opacity=".09"/>` +
      R(x, gy - 46, 2, 46, "#2c3633") + R(x - 1, gy - 2, 4, 2, "#2c3633") + R(x, gy - 46, 12, 2, "#2c3633") +
      R(x + 7, gy - 45, 9, 3, "#3a4542") + R(x + 8, gy - 42, 7, 1, "#fff1c4");
  }
  function wire(x1, y1, x2, y2, sag, color) {
    return `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.max(y1, y2) + sag} ${x2} ${y2}" stroke="${color}" stroke-width="1" fill="none"/>`;
  }

  const BG = {
    // Улица Памятьвиля ночью. Варианты: translator (на площади Переводчик), broken (он сломан), dark (все спят)
    street(v) {
      const rand = rng(7), gy = 150;
      let s = sky(rand, ["#04060d", "#060914", "#080d1c", "#0b1124", "#0e162c", "#121b34"], -60, 120, 110);
      s += moon(266, 22, 9) + bitClouds(rand, 4, "#2b6e4c");
      for (let x = 0; x < W;) {
        const w = 10 + fl(rand() * 18), h = 60 + fl(rand() * 44);
        s += R(x, gy - h, w, h, "#0a0f1a");
        for (let k = 0; k < 5; k++) if (rand() < 0.6) s += R(x + 2 + fl(rand() * (w - 4)), gy - h + 4 + fl(rand() * (h - 10)), 1, 1, "#4a5470");
        x += w;
      }
      const houses = [[4, 44, 84], [52, 34, 62], [90, 46, 96], [140, 30, 70], [174, 52, 108], [230, 36, 78], [270, 46, 90]];
      const lit = v === "dark" ? 0.1 : 0.5;
      houses.forEach(([x, w, h], i) => {
        s += house(rand, x, w, h, i % 2 ? ["#18231e", "#111915", "#26332c"] : ["#1b2731", "#131c24", "#2a3843"], lit, gy);
      });
      s += wire(48, gy - 84, 92, gy - 96, 10, "#1b2430") + wire(136, gy - 96, 176, gy - 108, 12, "#1b2430") + wire(226, gy - 108, 272, gy - 90, 14, "#1b2430");
      // мачта Wi-Fi с красным огоньком
      s += R(199, gy - 140, 2, 32, "#2c3633") + R(195, gy - 132, 10, 1, "#2c3633") + R(196, gy - 124, 8, 1, "#2c3633") +
        R(198, gy - 143, 4, 3, "#ff5a5a", anim(rand, "st-blink", 1.5, 0.5));
      if (v === "translator" || v === "broken") {
        const ok = v === "translator";
        s += R(124, 76, 72, 74, "#1d2830") + R(124, 76, 72, 2, "#34474f") + R(192, 76, 4, 74, "#131b21");
        s += R(134, 60, 3, 16, "#2c3633") + R(183, 60, 3, 16, "#2c3633") + R(127, 50, 66, 12, "#c4893f") + R(127, 50, 66, 1, "#e8b46a") + R(127, 61, 66, 1, "#7a5223");
        s += T(131, 59, "ПЕРЕВОДЧИК", 8, "#1a1208", 'font-weight="700"');
        s += R(130, 82, 60, 36, "#0b1216") + R(132, 84, 56, 32, "#031008") + R(132, 84, 56, 32, pat("scan", "#000000"));
        s += ok
          ? T(140, 106, "А Б В", 14, "#5cf29a", 'class="st-blink-slow" font-weight="700"')
          : T(136, 97, "0101 1110", 8, "#ff6b6b", 'class="st-jitter"') + T(136, 109, "1000 0110", 8, "#ff6b6b", 'class="st-jitter"');
        for (let gx = 136; gx < 186; gx += 3) for (let gy2 = 124; gy2 < 132; gy2 += 3) s += R(gx, gy2, 1, 1, "#0a0f12");
        for (let i = 0; i < 4; i++) s += R(136 + i * 13, 136, 8, 3, i % 2 ? "#5cf29a" : "#e0a458", anim(rand, "st-blink", 1, 2));
        s += R(128, 144, 64, 6, "#121a1e");
      }
      // тротуар, бордюр, дорога-плата
      s += R(0, gy, W, 7, "#1d2725") + R(0, gy, W, 1, "#33403d");
      for (let x = 6; x < W; x += 14) s += R(x, gy + 1, 1, 6, "#151d1b");
      s += R(0, gy + 7, W, 2, "#2b3633") + R(0, gy + 9, W, H - gy - 9, "#0a0f0e") + traces(rand, gy + 9, H, "#3d2f1c", "#7a5a30");
      s += lamp(30, gy) + lamp(214, gy) + lamp(300, gy);
      return s;
    },

    // Квартал Процессорной башни. Варианты: hot (разогнана, дымит)
    tower(v) {
      const rand = rng(11), hot = v === "hot", gy = 146;
      let s = hot ? sky(rand, ["#0d0408", "#14060b", "#1c080f", "#260b12", "#2f1012", "#371611"], -60, 140, 60)
        : sky(rand, ["#04060d", "#060914", "#080d1c", "#0b1124", "#0e162c", "#121b34"], -60, 140, 90);
      s += bitClouds(rand, 3, hot ? "#8a4632" : "#2b6e4c");
      [[6, 58, 80], [252, 62, 96]].forEach(([x, w, h]) => {
        s += R(x, gy - h, w, h, "#121a17") + R(x + w - 3, gy - h, 3, h, "#0c1210") + R(x - 1, gy - h, w + 2, 2, "#22302a");
        for (let y = gy - h + 6; y < gy - 4; y += 8) {
          s += R(x, y + 6, w - 3, 1, "#0c1210");
          for (let lx = x + 4; lx < x + w - 6; lx += 6) s += R(lx, y, 3, 2, pick(rand, ["#5cf29a", "#6cc7ff", "#ffe066", "#1a2420", "#1a2420"]), anim(rand, "st-blink", 0.8, 2.5));
        }
        s += R(x + 8, gy - h - 6, 12, 6, "#1a2420") + R(x + 9, gy - h - 5, 10, 1, "#0c1210");
      });
      if (hot) s += R(20, -60, 280, gy + 60, pat("glow", "#c2401c"), 'class="st-glow"');
      // тепловые трубки
      s += R(98, 64, 3, 22, "#b5773a") + R(98, 64, 12, 3, "#b5773a") + R(219, 64, 3, 22, "#b5773a") + R(210, 64, 12, 3, "#b5773a");
      // радиатор
      s += R(104, 14, 112, 4, "#5c6870") + R(104, 62, 112, 6, "#5c6870") + R(104, 62, 112, 1, "#8d99a1");
      for (let x = 108; x < 214; x += 6) s += R(x, 18, 3, 44, "#6f7c86") + R(x, 18, 1, 44, "#a3afb7");
      // вентилятор
      s += R(138, 20, 44, 42, "#101318") + C(160, 41, 19, "#181c23") + C(160, 41, 19, "none", 'stroke="#2c323b" stroke-width="1"');
      s += `<g class="${hot ? "st-spin st-fast" : "st-spin"}">` +
        P("160,41 152,24 166,25", "#8d99a1") + P("160,41 177,33 176,47", "#8d99a1") + P("160,41 168,58 154,57", "#8d99a1") + P("160,41 143,49 144,35", "#8d99a1") +
        C(160, 41, 5, "#3a424c") + C(160, 41, 2, "#5c6870") + "</g>";
      for (const [sx, sy] of [[140, 22], [178, 22], [140, 58], [178, 58]]) s += R(sx, sy, 2, 2, "#3a424c");
      // процессор: подложка, крышка, ножки
      s += R(100, 72, 120, 74, "#0f2a1c") + R(100, 72, 120, 1, "#2a6a48") + R(100, 72, 2, 74, "#c99a4a") + R(218, 72, 2, 74, "#c99a4a");
      for (let y = 78; y < 142; y += 5) s += R(93, y, 7, 2, "#d6a256") + R(220, y, 7, 2, "#d6a256");
      for (let i = 0; i < 10; i++) s += R(104 + (i % 5) * 4, i < 5 ? 76 : 140, 2, 2, "#b08a5a");
      const lid = hot ? "#9a5a48" : "#8c96a0";
      s += R(114, 84, 92, 54, "#11151a") + R(116, 86, 88, 50, lid) + R(116, 86, 88, 2, hot ? "#c48068" : "#b8c1c8") + R(116, 134, 88, 2, "#5a626b");
      s += T(132, 117, "CPU", 24, hot ? "#ffd0b8" : "#2a2f37", 'font-weight="700"') + T(132, 130, hot ? "5.9 GHz  OC!" : "3.0 GHz", 7, hot ? "#ffd0b8" : "#3a4048");
      s += R(122, 90, 3, 3, hot ? "#ff6b6b" : "#5cf29a", anim(rand, "st-blink", hot ? 0.4 : 2, 0.5));
      // градусник
      const lvl = hot ? 66 : 18;
      s += R(242, 52, 12, 86, "#1a2420") + R(244, 54, 8, 80, "#06090a") + R(244, 134 - lvl, 8, lvl, hot ? "#ff5a5a" : "#4fd98a", hot ? 'class="st-blink-slow"' : "");
      s += C(248, 142, 8, hot ? "#ff5a5a" : "#4fd98a") + C(246, 140, 2, "#ffffff", 'opacity=".4"');
      for (let y = 58; y < 132; y += 8) s += R(255, y, 3, 1, "#6f7d78");
      s += T(234, 46, hot ? "105 °C" : "45 °C", 8, hot ? "#ff6b6b" : "#9bb0a4", 'font-weight="700"');
      if (hot) for (let i = 0; i < 7; i++) {
        const x = 112 + i * 15;
        s += `<g class="st-heat" style="animation-delay:-${(i * 0.31).toFixed(2)}s">` + R(x, 10, 1, 3, "#ffb08a") + R(x + 1, 7, 1, 3, "#ffb08a") + R(x, 4, 1, 3, "#ffb08a") + R(x + 1, 1, 1, 3, "#ffb08a") + "</g>";
      }
      s += R(0, gy, W, H - gy, "#0b2016") + R(0, gy, W, 2, "#1f5a39") + traces(rand, gy + 2, H, "#5a4524", "#a07a40");
      s += T(10, 176, "PAMYATVIL MB-01", 6, "#2f6a4c");
      return s;
    },

    // Серверная с мигающими лампочками. Варианты: alarm (всё красное)
    servers(v) {
      const rand = rng(23), alarm = v === "alarm", gy = 148;
      let s = R(0, TOP, W, gy - TOP, "#0a0f0d");
      for (let x = 0; x < W; x += 32) s += R(x, TOP, 1, gy - TOP, "#111815");
      for (let x = 20; x < W; x += 80) s += R(x, -62, 44, 3, "#e8f4ff") + R(x - 6, -59, 56, 10, "#e8f4ff", 'opacity=".05"');
      s += R(0, -20, W, 3, "#1e2924") + R(0, 6, W, 4, "#22302a") + R(0, 6, W, 1, "#33463d");
      ["#6cc7ff", "#e0a458", "#5cf29a", "#ff8fa3", "#b9c4ff"].forEach((c, i) => {
        for (let x = 6 + i * 13; x < W; x += 62) s += wire(x, 10, x + 26, 10, 6 + i * 2, c);
      });
      [8, 70, 132, 194, 256].forEach((x) => {
        s += R(x, 22, 56, gy - 22, "#141b18") + R(x, 22, 56, 2, "#2a3a32") + R(x, 22, 2, gy - 22, "#222e29") + R(x + 54, 22, 2, gy - 22, "#090d0b");
        for (let y = 26; y < gy - 2; y += 6) s += R(x + 4, y, 1, 1, "#2c3a33") + R(x + 51, y, 1, 1, "#2c3a33");
        for (let y = 28; y < gy - 10; y += 12) {
          s += R(x + 6, y, 44, 10, "#1b2420") + R(x + 6, y, 44, 1, "#26322d") + R(x + 8, y + 2, 18, 6, pat("vent", "#0d1210"));
          s += R(x + 28, y + 2, 10, 6, "#222c28") + R(x + 29, y + 4, 8, 1, "#11161a");
          const cols = alarm ? ["#ff5a5a", "#ff5a5a", "#ffd25a"] : ["#5cf29a", "#5cf29a", "#6cc7ff", "#ffe066"];
          s += R(x + 41, y + 2, 2, 1, pick(rand, cols), anim(rand, "st-blink", alarm ? 0.3 : 0.5, alarm ? 0.4 : 2.4));
          s += R(x + 45, y + 2, 2, 1, pick(rand, cols), anim(rand, "st-blink", alarm ? 0.3 : 0.5, alarm ? 0.4 : 2.4));
          s += R(x + 41, y + 6, 2, 1, pick(rand, cols), anim(rand, "st-blink", alarm ? 0.3 : 0.5, alarm ? 0.4 : 2.4));
        }
        if (alarm) s += R(x + 24, 14, 8, 6, "#ff3b3b", anim(rand, "st-blink", 0.5, 0.2));
      });
      s += R(0, gy, W, H - gy, "#0e1412") + R(0, gy, W, 1, "#26332d");
      for (let x = 0; x < W; x += 24) s += R(x, gy, 1, H - gy, "#161e1b");
      s += R(0, gy + 12, W, 1, "#161e1b") + R(0, gy + 26, W, 1, "#161e1b");
      return s;
    },

    // Рынок оперативной памяти: прилавки в виде планок RAM. Варианты: forget (всё забыли)
    ram(v) {
      const rand = rng(31), forget = v === "forget", gy = 150;
      let s = sky(rand, ["#04060d", "#060914", "#080d1c", "#0b1124", "#0e162c", "#121b34"], -60, 120, 90) + bitClouds(rand, 3, "#2b6e4c");
      for (let x = 0; x < W; x += 24) s += R(x, gy - 64 - fl(rand() * 24), 24, 90, "#0a0f1a");
      for (const y0 of [24, 36]) {
        s += wire(-10, y0, 330, y0, 10, "#1b2430");
        for (let x = 4; x < W; x += 12) {
          const y = y0 + Math.round(10 * (1 - Math.pow((x - 160) / 170, 2))) - 1;
          const c = pick(rand, ["#ffe066", "#ff8fa3", "#6cc7ff", "#5cf29a"]);
          s += `<g ${anim(rand, "st-blink", 1, 3)}>${R(x - 1, y, 4, 4, c, 'opacity=".2"')}${R(x, y + 1, 2, 2, c)}</g>`;
        }
      }
      const labels = ["8 ГБ", "16 ГБ", "32 ГБ"];
      [10, 116, 222].forEach((x, i) => {
        s += R(x + 4, 56, 2, 46, "#2c3633") + R(x + 82, 56, 2, 46, "#2c3633");
        const stripe = i === 1 ? "#6cc7ff" : "#e0a458";
        for (let k = 0; k < 11; k++) {
          const c = k % 2 ? "#efe6d2" : stripe;
          s += R(x + k * 8, 46, 8, 10, c) + R(x + k * 8 + 1, 56, 6, 2, c) + R(x + k * 8 + 2, 58, 4, 1, c);
        }
        s += R(x, 46, 88, 1, "#ffffff", 'opacity=".25"') + R(x, 54, 88, 1, "#000000", 'opacity=".25"');
        s += R(x + 28, 64, 32, 12, "#121a17") + R(x + 28, 64, 32, 1, "#2a3a32") + T(x + 31, 73, forget ? "? ГБ" : labels[i], 8, forget ? "#ff6b6b" : "#ffe066", 'font-weight="700"');
        // планка-прилавок
        s += R(x, 100, 88, 32, "#17552f") + R(x, 100, 88, 1, "#2a7a49") + R(x, 131, 88, 1, "#0d3a1f");
        for (let c = 0; c < 8; c++) {
          const cx = x + 4 + c * 10;
          s += R(cx, 104, 8, 14, "#0f1114") + R(cx, 104, 8, 1, "#2a2d35");
          for (let p = 0; p < 4; p++) s += R(cx + 1 + p * 2, 103, 1, 1, "#9aa3ad") + R(cx + 1 + p * 2, 118, 1, 1, "#9aa3ad");
          s += forget ? T(cx + 1, 115, "?", 10, "#fff4e0", 'class="st-blink-slow" font-weight="700"') : R(cx + 2, 110, 2, 2, "#3a3f48");
        }
        for (let p = 2; p < 86; p += 2) if (p < 40 || p > 46) s += R(x + p, 124, 1, 7, "#c99a4a");
        s += R(x + 41, 126, 5, 6, "#0a0f0e") + R(x + 70, 120, 14, 3, "#e9e2cc", 'opacity=".85"');
        s += R(x + 84, 76, 1, 14, "#6f7d78") + R(x + 80, 90, 10, 8, "#e9e2cc") + R(x + 81, 92, 8, 1, "#3a3f48");
      });
      s += R(0, gy, W, H - gy, "#131917") + R(0, gy, W, 1, "#2b3633");
      for (let y = gy + 3; y < H; y += 5) for (let x = (y % 2) * 4; x < W; x += 9) if (rand() < 0.85) s += R(x, y, 6, 3, "#1a2220") + R(x, y, 6, 1, "#222b29");
      return s;
    },

    // Склад дисков. Варианты: wrong (огромный HDD крутится не туда и стучит)
    warehouse(v) {
      const rand = rng(41), wrong = v === "wrong", gy = 148;
      let s = R(0, TOP, W, gy - TOP, "#111519");
      for (let x = 0; x < W; x += 4) s += R(x, TOP, 1, gy - TOP, "#14191d");
      s += R(0, 18, W, 4, "#1b2228") + R(0, -46, W, 4, "#1b2228");
      for (let x = 6; x < W; x += 20) s += R(x, 19, 2, 2, "#2c353d") + R(x, -45, 2, 2, "#2c353d");
      for (const x of [60, 160, 260]) {
        s += R(x, TOP, 1, 104, "#2c353d") + P(`${x - 10},-36 ${x + 11},-36 ${x + 6},-42 ${x - 5},-42`, "#3a434b") + R(x - 4, -36, 9, 2, "#fff1c4", wrong && x === 160 ? anim(rand, "st-blink", 0.3, 0.3) : "");
        s += P(`${x - 4},-34 ${x + 5},-34 ${x + 40},${gy} ${x - 39},${gy}`, "#fff1c4", 'opacity=".035"');
      }
      // полки
      [[4, 92], [224, 92]].forEach(([x, w]) => {
        s += R(x, 22, 3, gy - 22, "#3a2a18") + R(x + w - 3, 22, 3, gy - 22, "#3a2a18");
        [58, 102, 146].forEach((y) => {
          s += R(x, y, w, 3, "#4d3620") + R(x, y, w, 1, "#6b4c2c") + R(x, y + 3, w, 1, "#1f160c");
          let ix = x + 4;
          while (ix < x + w - 20) {
            const t = rand();
            if (t < 0.32) { s += R(ix, y - 18, 18, 18, "#6f7882") + R(ix, y - 18, 18, 1, "#99a2ab") + C(ix + 9, y - 10, 5, "none", 'stroke="#454d55" stroke-width="1"') + R(ix + 3, y - 4, 9, 2, "#d8dde3"); ix += 20; }
            else if (t < 0.58) { s += R(ix, y - 10, 20, 10, "#143024") + R(ix, y - 10, 20, 1, "#245a40") + R(ix + 2, y - 8, 6, 6, "#0f1114") + R(ix + 10, y - 8, 6, 6, "#0f1114") + R(ix + 17, y - 6, 2, 4, "#c99a4a"); ix += 22; }
            else if (t < 0.8) { s += R(ix, y - 14, 14, 14, "#28427a") + R(ix + 4, y - 14, 6, 5, "#aeb6bf") + R(ix + 6, y - 13, 2, 3, "#28427a") + R(ix + 2, y - 7, 10, 6, "#e8e4d4"); ix += 16; }
            else { s += R(ix, y - 16, 20, 16, "#5c4429") + R(ix, y - 16, 20, 1, "#7d5d39") + R(ix + 8, y - 16, 4, 16, "#a8895a"); ix += 22; }
          }
        });
      });
      // большой открытый HDD
      s += R(106, 28, 108, 116, "#1a1f24") + R(108, 30, 104, 112, "#6c757e") + R(108, 30, 104, 1, "#9aa3ab") + R(112, 34, 96, 104, "#353c43");
      for (const [sx, sy] of [[110, 32], [208, 32], [110, 138], [208, 138]]) s += R(sx, sy, 2, 2, "#2a3036");
      s += C(156, 82, 41, "#0f1215") + C(156, 82, 40, "#b9c2cb");
      for (let r = 12; r < 40; r += 6) s += C(156, 82, r, "none", 'stroke="#a3adb7" stroke-width="1"');
      s += `<g class="st-spin ${wrong ? "st-rev st-wobble" : "st-slow"}">` + P("156,82 194,74 194,90", "#eef2f5", 'opacity=".55"') + P("156,82 118,74 118,90", "#9aa3ad", 'opacity=".35"') + "</g>";
      s += C(156, 82, 8, "#8d96a0") + C(156, 82, 3, "#3a4148");
      s += `<g class="${wrong ? "st-jitter" : ""}">` + C(198, 44, 8, "#5f6870") + C(198, 44, 3, "#2a3036") + P("194,46 200,50 172,78 168,74", "#c99a4a") + R(166, 74, 6, 5, "#d8dde3") + "</g>";
      s += R(122, 128, 44, 6, "#1f2429");
      for (let p = 124; p < 164; p += 3) s += R(p, 129, 2, 4, "#c99a4a");
      s += T(172, 134, "HDD 7200", 7, "#d8dde3");
      // пол и предупреждающие полосы
      s += R(0, gy, W, H - gy, "#171c20") + R(0, gy, W, 1, "#2f373e");
      for (let x = 0; x < W; x += 12) if (x < 100 || x > 216) s += P(`${x},${gy + 2} ${x + 6},${gy + 2} ${x + 2},${gy + 6} ${x - 4},${gy + 6}`, "#c9a43a", 'opacity=".55"');
      s += `<path d="M30 ${gy + 18} l12 3 l9 -2 l14 4" stroke="#0d1013" fill="none"/><path d="M230 ${gy + 24} l10 -3 l8 4" stroke="#0d1013" fill="none"/>`;
      return s;
    },

    // Внутри монитора: огромная сетка пикселей с субпикселями. Варианты: broken (мёртвые пиксели), rgb (лупа на пиксель)
    monitor(v) {
      const rand = rng(53), broken = v === "broken";
      let s = R(0, TOP, W, H - TOP, "#030405");
      const skyC = ["#24458a", "#2c4f9a", "#3460b0", "#3d70c4", "#4a82d4", "#5a94e0", "#6aa6ea", "#7ab6f0", "#86c0f2", "#92caf4", "#9ed2f6", "#a8d8f8", "#b2def8", "#bce2f8", "#c4e6fa", "#c4e6fa"];
      for (let cy = TOP / 10; cy < 18; cy++) {
        for (let cx = 0; cx < 32; cx++) {
          let c;
          const hill = 11 + Math.sin(cx / 4) * 1.6 + Math.sin(cx / 9) * 1.2;
          const sun = (cx - 6) * (cx - 6) + (cy - 4) * (cy - 4) < 7;
          if (sun) c = "#ffe066";
          else if (cy > 14) c = cy % 2 ? "#2b5a2f" : "#2f6334";
          else if (cy > hill) c = cy > hill + 2 ? "#3f8f4a" : "#5cbf5a";
          else c = skyC[Math.max(0, cy + 1)] || skyC[0];
          let a = "";
          if (broken) {
            const g = 70 + fl(rand() * 50);
            c = `rgb(${g},${g},${g + 6})`;
            const t = rand();
            if (t < 0.22) c = "#000000";
            else if (t < 0.25) { c = "#ff3b3b"; a = 'class="st-blink-slow"'; }
          } else if (rand() < 0.03) a = anim(rand, "st-shimmer", 2, 3);
          s += R(cx * 10, cy * 10, 8, 8, c, a);
        }
      }
      // субпиксели: тёмные перегородки внутри каждой клетки
      s += R(0, TOP, W, H - TOP, pat("sub", "#000000"), 'opacity=".55"');
      s += R(0, TOP, W, H - TOP, "#000000", 'opacity=".28"');
      if (v === "rgb") {
        s += R(222, 10, 86, 70, "#0a0a0a") + R(224, 12, 82, 66, "#efe6d2") + R(227, 15, 76, 60, "#0a0a0a");
        s += R(232, 20, 18, 44, "#ff3b3b") + R(256, 20, 18, 44, "#3bff6b") + R(280, 20, 18, 44, "#3b7bff");
        s += T(237, 73, "R", 8, "#ff8a8a", 'font-weight="700"') + T(261, 73, "G", 8, "#8affa8", 'font-weight="700"') + T(285, 73, "B", 8, "#8ab0ff", 'font-weight="700"');
        s += P("224,78 214,92 217,93 227,80", "#efe6d2");
      }
      return s;
    },

    // Загрузочный экран. Для крючка на следующий месяц.
    boot() {
      let s = R(0, TOP, W, H - TOP, "#000000");
      const lines = ["Памятьвиль BIOS v1.0", "Проверка памяти ... 16384 МБ  OK", "Диски ............ OK", "Видеокарта ....... OK", "Процессорск ...... НЕТ СВЯЗИ"];
      lines.forEach((l, i) => { s += T(16, 52 + i * 14, l, 8, i === 4 ? "#ff6b6b" : "#c9d1d9", i === 4 ? 'class="st-blink-slow"' : ""); });
      s += T(16, 132, "Press DEL to enter SETUP", 8, "#ffe066") + R(16, 138, 6, 2, "#c9d1d9", 'class="st-blink"');
      s += `<g class="st-blink-slow">` + R(272, 160, 6, 3, "#ff6b6b") + R(290, 160, 6, 3, "#ff6b6b") + "</g>";
      s += R(0, TOP, W, H - TOP, pat("scan", "#000000"), 'opacity=".5"');
      return s;
    },
  };

  // Приглушаем фон: ниже насыщенность и яркость, яркие огоньки темнеют меньше.
  const shadeCache = {};
  function shade(col) {
    if (shadeCache[col]) return shadeCache[col];
    let r, g, b, m;
    if ((m = /^#([0-9a-f]{6})$/i.exec(col))) { const n = parseInt(m[1], 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
    else if ((m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(col))) { r = +m[1]; g = +m[2]; b = +m[3]; }
    else return col;
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    s *= 0.68;
    l = l < 0.5 ? l * 0.66 : 0.33 + (l - 0.5) * 0.78;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const hue = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    const out = "#" + [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
    return (shadeCache[col] = out);
  }

  let bgCount = 0;
  function bgSVG(spec) {
    const [name, variant] = String(spec || "street").split(":");
    const fn = BG[name] || BG.street;
    UID = "stbg" + ++bgCount; DEFS = {};
    let body = fn(variant || "");
    const defs = Object.values(DEFS).join("");
    const out = (defs ? `<defs>${defs}</defs>` : "") + body;
    return `<svg viewBox="0 ${TOP} ${W} ${H - TOP}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
      out.replace(/fill="(#[0-9a-fA-F]{6}|rgb\([^)]*\))"/g, (m0, c) => `fill="${shade(c)}"`) + "</svg>";
  }

  // ---------- плеер ----------
  const ONESHOT = ["jump", "shake", "bounce", "float", "spin", "pop"];
  const SR = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;";

  function Player(root, id, story) {
    const cast = Object.assign({}, CAST, story.cast || {});
    const beats = story.beats || [];
    const last = beats.length - 1;
    root.classList.add("story-on");
    root.innerHTML = `
      <div class="st-head">
        <span class="st-badge">Комикс</span>
        <span class="st-title">Серия: ${esc(story.title || "")}</span>
      </div>
      <div class="st-stage" tabindex="0" role="group" aria-roledescription="комикс" aria-label="Комикс: ${esc(story.title || "")}">
        <div class="st-world"><div class="st-bg"></div><div class="st-actors"></div><div class="st-fx"></div></div>
        <div class="st-mood"></div><div class="st-flash"></div><div class="st-vignette"></div>
        <span class="st-count" aria-hidden="true"></span>
        <svg class="st-tail" aria-hidden="true" hidden><polygon points="0,0 0,0 0,0"/></svg>
        <div class="st-bubble" hidden><b class="st-bname" aria-hidden="true"></b><span class="st-btext" aria-hidden="true"></span></div>
        <div class="st-top"><p class="st-caption" aria-hidden="true" hidden></p><div class="st-sign" hidden></div></div>
        <div class="st-cover">
          <span data-cover-art></span>
          <button type="button" class="btn st-play">Смотреть комикс</button>
          <p class="st-seen" hidden>Уже смотрели. Можно ещё раз.</p>
        </div>
      </div>
      <div style="${SR}" class="st-live" aria-live="polite"></div>
      <div class="st-bar" hidden>
        <button type="button" class="st-btn st-prev" aria-label="Назад, прошлая реплика">&larr;<span> Назад</span></button>
        <button type="button" class="st-btn st-skip">Пропустить</button>
        <button type="button" class="st-btn st-snd" aria-pressed="true"></button>
        <button type="button" class="st-btn st-next" aria-label="Дальше">Дальше &rarr;</button>
        <p class="st-hint"></p>
      </div>`;
    const $ = (s) => root.querySelector(s);
    const stage = $(".st-stage"), world = $(".st-world"), bgEl = $(".st-bg"), actorsEl = $(".st-actors"), fxEl = $(".st-fx");
    const signEl = $(".st-sign"), capEl = $(".st-caption"), topEl = $(".st-top"), moodEl = $(".st-mood"), flashEl = $(".st-flash");
    const bubble = $(".st-bubble"), bname = $(".st-bname"), btext = $(".st-btext"), tail = $(".st-tail"), tailPoly = tail.querySelector("polygon");
    const cover = $(".st-cover"), bar = $(".st-bar"), countEl = $(".st-count"), hint = $(".st-hint"), live = $(".st-live");
    const prevBtn = $(".st-prev"), nextBtn = $(".st-next"), skipBtn = $(".st-skip"), sndBtn = $(".st-snd");
    const choicesEl = document.createElement("div");
    choicesEl.className = "st-choices";
    choicesEl.setAttribute("role", "group");
    choicesEl.setAttribute("aria-label", "Выбери ответ");
    choicesEl.hidden = true;
    bubble.append(choicesEl);
    function sndLabel() {
      sndBtn.innerHTML = '<span aria-hidden="true">&#9834;</span> <span class="st-snd-word">Звук: </span>' + (SFX.on ? "вкл" : "выкл");
      sndBtn.setAttribute("aria-label", "Звук");
      sndBtn.setAttribute("aria-pressed", SFX.on ? "true" : "false");
      sndBtn.classList.toggle("off", !SFX.on);
    }
    sndLabel();
    sndBtn.addEventListener("click", () => {
      SFX.set(!SFX.on);
      document.querySelectorAll(".st-snd").forEach((b) => b.dispatchEvent(new Event("st-sound")));
      SFX.play("click");
    });
    sndBtn.addEventListener("st-sound", sndLabel);
    const HINT = touchy()
      ? "Нажми на картинку: дальше. Свайп ← → листает, «←» возвращает."
      : "Клик по картинке, пробел или → дальше · ← назад";
    const hintPick = (n) => (touchy() ? "Выбери ответ: нажми на вариант." : "Выбери ответ: клик, цифра 1–" + n + " или стрелки и Enter.");
    hint.textContent = HINT;

    let st, idx = -1, playing = false, gen = 0, typing = null, bgSpec = null;
    let speaker = null, speakTextNode = null, restNode = null;
    const views = {};

    // ---------- ветки и выборы ----------
    // path: номера кадров, которые прошли в этом просмотре (по нему ходит «Назад»).
    // picks: номер кадра с вопросом → номер выбранного варианта (в этом просмотре).
    let path = [], picks = {}, atEnd = false, picking = false;
    const labels = {};
    beats.forEach((b, i) => { if (b.label != null && !(b.label in labels)) labels[b.label] = i; });
    const branchy = beats.some((b) => b.choice || b.goto != null || b.if);
    const ownKeys = new Set(beats.filter((b) => b.choice && b.remember).map((b) => b.remember));
    const valueOf = (b, k) => {
      const o = b.choice[k] || {};
      return String(o.value != null ? o.value : o.go != null ? o.go : k + 1);
    };
    // Текущий ответ по ключу: из своей сценки только ответ этого просмотра, иначе сохранённый.
    function memo(key) {
      if (ownKeys.has(key)) {
        for (const i of path) if (beats[i].remember === key && picks[i] != null) return valueOf(beats[i], picks[i]);
        return null;
      }
      const v = loadChoices()[key];
      return v == null ? null : String(v);
    }
    function ok(b) {
      if (!b || !b.if) return true;
      return Object.keys(b.if).every((key) => {
        const want = b.if[key], have = memo(key);
        if (want === "*") return have != null;
        if (want == null || want === "") return have == null;
        if (Array.isArray(want)) return want.some((w) => (w == null || w === "" ? have == null : String(w) === have));
        return String(want) === have;
      });
    }
    function target(lbl) {
      if (lbl in labels) return labels[lbl];
      if (lbl !== "end" && window.console) console.warn("story " + id + ": нет метки " + lbl);
      return -1;
    }
    function skipIfs(j) {
      while (j >= 0 && j <= last && !ok(beats[j])) j++;
      return j > last ? -1 : j;
    }
    // Куда идти после кадра i (k: выбранный вариант или undefined). -1: конец.
    function after(i, k) {
      const b = beats[i];
      let dest = null;
      if (b.choice) {
        const o = k != null ? b.choice[k] : null;
        if (o && o.go != null) dest = o.go;
        else if (!o && b.after != null) dest = b.after;
      }
      if (dest == null && b.goto != null) dest = b.goto;
      return skipIfs(dest == null ? i + 1 : target(dest));
    }
    const needsPick = (i) => !!(beats[i] && beats[i].choice && beats[i].choice.length && picks[i] == null);
    // Сколько кадров примерно осталось (на невыбранных вопросах берём первый вариант).
    function remaining(i) {
      let n = 0, guard = 0;
      while (guard++ < beats.length * 4) {
        const b = beats[i];
        const k = picks[i] != null ? picks[i] : b.choice && b.choice.length ? 0 : undefined;
        i = after(i, k);
        if (i < 0) break;
        n++;
      }
      return n;
    }

    function fresh() { return { bg: null, mood: null, sign: null, actors: {}, shots: [], zoom: null, fx: [] }; }
    function actor(aid) {
      if (!st.actors[aid]) {
        const c = cast[aid] || {};
        st.actors[aid] = { x: c.x != null ? c.x : 50, sprite: c.sprite || aid, face: 1, visible: false, idle: c.idle || null };
      }
      return st.actors[aid];
    }
    const ground = () => GROUND[String(st.bg || "street").split(":")[0]] || 83;

    // Применяем кадр к состоянию (без DOM).
    function apply(b) {
      st.shots = []; st.zoom = null; st.fx = [];
      if (b.bg) st.bg = b.bg;
      if ("mood" in b) st.mood = b.mood;
      if ("sign" in b) st.sign = b.sign;
      for (const aid in b.show || {}) {
        const a = actor(aid), o = b.show[aid] || {};
        Object.assign(a, o); a.visible = !o.hide; a.enterFrom = a.exitTo = null;
      }
      let list = b.do || [];
      if (typeof list === "string") list = list.split(";");
      list.map((s) => (Array.isArray(s) ? s : s.trim().split(/\s+/))).forEach(([aid, verb, arg, arg2]) => {
        if (!aid || !verb) return;
        const a = actor(aid);
        const side = (x) => (x === "right" ? 120 : -20);
        if (verb === "enter") {
          a.enterFrom = side(arg || (a.x > 50 ? "right" : "left"));
          if (arg2 != null && !isNaN(arg2)) a.x = Number(arg2);
          else if (arg != null && !isNaN(arg)) a.x = Number(arg);
          a.visible = true; a.exitTo = null;
        } else if (verb === "exit") { a.exitTo = side(arg || (a.x > 50 ? "right" : "left")); a.visible = false; }
        else if (verb === "move" || verb === "to") { a.x = Number(arg); a.walk = true; }
        else if (verb === "flip") { a.face *= -1; }
        else if (verb === "face") { a.face = arg === "left" ? -1 : 1; }
        else if (verb === "as" || verb === "emo") { a.sprite = arg; st.shots.push([aid, "pop"]); }
        else if (verb === "hide") { a.visible = false; a.exitTo = null; }
        else if (verb === "show") { a.visible = true; }
        else if (ONESHOT.includes(verb)) st.shots.push([aid, verb]);
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

    function viewFor(aid) {
      if (views[aid]) return views[aid];
      const el = document.createElement("div");
      el.className = "st-actor";
      el.hidden = true;
      el.dataset.actor = aid;
      // случайный сдвиг, чтобы герои дышали и моргали не хором
      el.style.setProperty("--breath", (2.4 + Math.random() * 1.4).toFixed(2) + "s");
      el.style.setProperty("--breath-delay", (-Math.random() * 3).toFixed(2) + "s");
      el.style.setProperty("--blink", (3.2 + Math.random() * 3).toFixed(2) + "s");
      el.style.setProperty("--blink-delay", (-Math.random() * 5).toFixed(2) + "s");
      el.innerHTML = '<span class="st-pool"></span><span class="st-shadow"></span><div class="st-a-act"><div class="st-a-idle"><div class="st-a-breathe"><div class="st-a-face"></div></div></div></div><span class="st-tag"></span>';
      actorsEl.append(el);
      const act = el.querySelector(".st-a-act");
      const v = { el, act, idle: el.querySelector(".st-a-idle"), face: el.querySelector(".st-a-face"), tag: el.querySelector(".st-tag"), key: "", wu: 48, hu: 42 };
      el.addEventListener("transitionend", (e) => { if (e.propertyName === "left") el.classList.remove("walking"); });
      act.addEventListener("animationend", (e) => { if (e.target === act) act.className = "st-a-act"; });
      return (views[aid] = v);
    }

    function render(animate) {
      const myGen = gen;
      if (st.bg !== bgSpec) { bgSpec = st.bg; bgEl.innerHTML = bgSVG(st.bg); }
      moodEl.className = "st-mood" + (st.mood ? " mood-" + st.mood : "");
      if (st.sign) { signEl.hidden = false; signEl.textContent = st.sign; } else signEl.hidden = true;
      const g = ground();

      for (const aid in st.actors) {
        const a = st.actors[aid], v = viewFor(aid), el = v.el;
        const res = resolve(aid, a.sprite, cast);
        const key = res.name + "|" + res.filter;
        if (v.key !== key) {
          v.key = key;
          const A = art(res.name);
          const scale = (cast[aid] && cast[aid].scale) || 1.5;
          // ширина всегда 32 логических пикселя на масштаб; высота по арту (HD до 40 px, старый 16 px x2)
          v.wu = 32 * scale;
          v.hu = (A ? A.rows.length * A.k : 28) * scale;
          el.style.setProperty("--w", String(v.wu));
          el.style.setProperty("--h", String(v.hu));
          el.classList.toggle("hd", !!(A && A.hd));
          if (A) {
            const bl = blinkFrame(res.name, A);
            v.face.innerHTML = svgOf(A, A.rows, "px st-open") + (bl ? svgOf(A, bl, "px st-shut") : "");
          } else v.face.innerHTML = '<div class="st-noart"></div>';
          v.face.style.filter = res.filter || "";
        }
        v.tag.textContent = (cast[aid] && cast[aid].name) || aid;
        el.style.setProperty("--c", (cast[aid] && cast[aid].color) || "#e0a458");
        v.face.style.transform = "scaleX(" + (a.face < 0 ? -1 : 1) + ")";
        v.idle.className = "st-a-idle" + (a.idle ? " idle-" + a.idle : "");
        el.style.setProperty("--g", String(H - g));
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
          setTimeout(() => { if (myGen === gen && !st.actors[aid].visible) el.hidden = true; }, 900);
        } else el.hidden = true;
        if (!animate) { el.classList.add("no-tr"); el.classList.remove("walking"); void el.offsetWidth; el.classList.remove("no-tr"); }
        a.enterFrom = a.exitTo = null; a.walk = false;
      }

      if (animate) {
        st.shots.forEach(([aid, verb]) => {
          const v = views[aid];
          if (!v) return;
          v.act.className = "st-a-act";
          void v.act.offsetWidth;
          v.act.className = "st-a-act act-" + verb;
        });
      }

      if (st.zoom != null) {
        world.style.transformOrigin = xOf(st.zoom) + "% 75%";
        world.classList.add("zoomed");
      } else world.classList.remove("zoomed");

      if (animate) st.fx.forEach(([name, target]) => effect(name, target));
    }

    // ---------- эффекты ----------
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
          p.style.bottom = (st.actors[target] ? 30 : 45) + Math.random() * 6 + "%";
          p.style.animationDuration = (1.8 + Math.random() * 1.4).toFixed(2) + "s";
          p.style.animationDelay = (Math.random() * 1.4).toFixed(2) + "s";
          p.style.setProperty("--dx", (Math.random() * 30 - 15).toFixed(0) + "px");
          return p;
        }, 18, 4600);
      }
    }

    // ---------- реплики: пузырь у говорящего или подпись сверху ----------
    function speech(b, instant) {
      clearTimeout(typing);
      typing = null;
      const text = b.say || "";
      const who = b.who || "";
      const a = st.actors[who];
      const onStage = !!(a && a.visible);
      const name = b.name || (cast[who] ? cast[who].name : who);
      speaker = onStage && !b.name ? who : null;
      // говорящий подсвечен, остальные чуть темнее; to: "reader" — шаг к камере, лицом к ученику
      const facing = !!(speaker && b.to === "reader");
      actorsEl.classList.toggle("has-speaker", !!speaker);
      Object.keys(views).forEach((k) => {
        views[k].el.classList.toggle("speaking", k === speaker);
        views[k].el.classList.toggle("to-reader", facing && k === speaker);
      });
      stage.classList.toggle("st-reader", facing);
      bubble.classList.toggle("to-reader", facing);
      ["think", "shout", "whisper"].forEach((t) => bubble.classList.toggle("tone-" + t, b.tone === t));
      const opts = Array.isArray(b.choice) ? b.choice : [];
      live.textContent = (name ? name + ": " : "") + text +
        (opts.length ? " Варианты: " + opts.map((o, k) => k + 1 + ". " + o.label).join("; ") + "." : "");
      showChoices(opts, who ? bubble : topEl);

      let target;
      if (!who) {
        bubble.hidden = true; tail.setAttribute("hidden", "");
        capEl.hidden = false;
        target = capEl;
      } else {
        capEl.hidden = true;
        bubble.hidden = false;
        // имя над головой у того, кто на сцене; в пузыре имя только у голоса за кадром
        bubble.classList.toggle("voice", !speaker);
        bname.hidden = !!speaker;
        bname.textContent = speaker ? "" : name;
        if (speaker) bubble.style.setProperty("--c", cast[who] && cast[who].color || "#e0a458");
        target = btext;
      }
      // Текст сразу целиком: напечатанная часть видна, остаток невидим, но держит размер пузыря.
      target.textContent = "";
      speakTextNode = document.createTextNode("");
      restNode = document.createElement("span");
      restNode.style.visibility = "hidden";
      restNode.textContent = text;
      target.append(speakTextNode, restNode);
      if (who) place();
      const chars = Array.from(text);
      const voice = who ? (cast[who] && cast[who].voice) || "other" : "narrator";
      if (instant || reduced() || !chars.length) {
        speakTextNode.data = text; restNode.textContent = "";
        if (loudNow && chars.length) SFX.blip(voice);
        return;
      }
      if (speaker) views[speaker].el.classList.add("talking");
      let i = 0;
      const step = () => {
        i++;
        speakTextNode.data = chars.slice(0, i).join("");
        restNode.textContent = chars.slice(i).join("");
        if (i >= chars.length) { typing = null; stopTalk(); return; }
        const ch = chars[i - 1];
        if (i % 2 && /[^\s.,!?…:;«»"()-]/.test(ch)) SFX.blip(voice);
        typing = setTimeout(step, /[.!?…]/.test(ch) ? 240 : /[,:;]/.test(ch) ? 110 : 22);
      };
      typing = setTimeout(step, 150);
    }
    // Кнопки выбора: в пузыре говорящего или под подписью рассказчика.
    function showChoices(opts, host) {
      choicesEl.textContent = "";
      choicesEl.classList.remove("nudge");
      picking = false;
      if (!opts.length) { choicesEl.hidden = true; return; }
      if (host === topEl) { if (choicesEl.previousElementSibling !== capEl) capEl.after(choicesEl); }
      else if (choicesEl.parentNode !== bubble) bubble.append(choicesEl);
      opts.forEach((o, k) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "st-opt" + (picks[idx] === k ? " picked" : "");
        btn.dataset.k = String(k);
        if (picks[idx] === k) btn.setAttribute("aria-pressed", "true");
        btn.innerHTML = `<span class="st-okey" aria-hidden="true">${k + 1}</span><span class="st-olabel">${esc(o.label || "")}</span>`;
        choicesEl.append(btn);
      });
      choicesEl.hidden = false;
    }
    const optButtons = () => Array.from(choicesEl.querySelectorAll(".st-opt"));
    let lastHover = 0;
    function hoverSound() {
      const t = Date.now();
      if (t - lastHover > 70) { lastHover = t; SFX.play("hover"); }
    }
    choicesEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const btn = e.target.closest(".st-opt");
      if (btn && !btn.disabled) pick(Number(btn.dataset.k));
    });
    choicesEl.addEventListener("pointerenter", (e) => { if (e.target.closest && e.target.closest(".st-opt")) hoverSound(); }, true);
    choicesEl.addEventListener("focusin", hoverSound);
    function pick(k) {
      const b = beats[idx];
      if (!playing || picking || !b || !b.choice || !b.choice[k]) return;
      SFX.unlock();
      finishTyping();
      picking = true;
      picks[idx] = k;
      if (b.remember) saveChoice(b.remember, valueOf(b, k));
      SFX.play("pick");
      const hadFocus = choicesEl.contains(document.activeElement);
      optButtons().forEach((btn, j) => {
        btn.classList.toggle("picked", j === k);
        btn.setAttribute("aria-pressed", j === k ? "true" : "false");
        btn.disabled = true;
      });
      const myGen = gen, at = idx;
      setTimeout(() => {
        if (myGen !== gen || idx !== at || !playing) return;
        picking = false;
        if (hadFocus) stage.focus({ preventScroll: true });
        const j = after(at, k);
        if (j < 0) { go(at, false); nextBtn.focus({ preventScroll: true }); return; }
        path.push(j);
        go(j, !reduced(), true);
      }, reduced() ? 0 : 260);
    }
    function nudge() {
      SFX.play("click");
      if (!reduced()) restart(choicesEl, "nudge", 450);
      const first = choicesEl.querySelector(".st-opt");
      if (first && root.contains(document.activeElement)) first.focus({ preventScroll: true });
    }
    function stopTalk() { Object.values(views).forEach((v) => v.el.classList.remove("talking")); }
    function finishTyping() {
      if (!typing) return false;
      clearTimeout(typing);
      typing = null;
      speakTextNode.data += restNode.textContent;
      restNode.textContent = "";
      stopTalk();
      return true;
    }

    // Где поставить пузырь: над головой говорящего, а если не влезает, то сверху или сбоку. Хвостик всегда к нему.
    function place() {
      if (bubble.hidden) return;
      const SW = stage.clientWidth, SH = stage.clientHeight;
      if (!SW || !SH) return;
      const u = SW / W, pad = 6;
      const minTop = topEl.offsetHeight > 4 ? topEl.offsetTop + topEl.offsetHeight + 6 : pad;
      const asks = !choicesEl.hidden && choicesEl.parentNode === bubble;
      bubble.style.maxWidth = (asks ? Math.min(SW - pad * 2, Math.max(280, SW * 0.7), 520) : Math.min(SW - pad * 2, Math.max(220, SW * 0.62), 440)) + "px";
      bubble.style.left = "0px"; bubble.style.top = "0px";
      const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
      // с кнопками выбора пузырь целиком внутри кадра
      const fit = (t) => (asks ? Math.max(pad, Math.min(minTop, SH - bh - pad), Math.min(t, SH - bh - pad)) : t);
      if (!speaker) {
        // голос за кадром: справа сверху, без хвостика
        bubble.style.left = SW - bw - pad + "px";
        bubble.style.top = fit(Math.max(minTop, pad)) + "px";
        tail.setAttribute("hidden", "");
        return;
      }
      const a = st.actors[speaker], v = views[speaker];
      // голова говорящего в пикселях (с учётом приближения)
      let hx = (a.x / 100) * SW;
      const hw = v.wu * u;
      const headH = v.hu * u;
      const tagH = (v.tag.offsetHeight || 20) + 7;            // ярлык с именем над головой
      // к ученику (to-reader) герой крупнее и на шаг ближе: см. .st-actor.to-reader в CSS
      const near = v.el.classList.contains("to-reader");
      let headTop = SH - (H - ground()) * u + (near ? 8 * u : 0) - headH * (near ? 1.3 : 1.07) - tagH;
      if (st.zoom != null) {
        const ox = (xOf(st.zoom) / 100) * SW, oy = SH * 0.75, k = reduced() ? 1.2 : 1.3;
        hx = ox + (hx - ox) * k; headTop = oy + (headTop - oy) * k;
      }
      const gap = 18;
      let left = Math.min(Math.max(pad, hx - bw / 2), SW - bw - pad);
      let top = headTop - gap - bh, tip, base;
      if (top >= minTop) {
        tip = [hx, headTop - 2];
      } else {
        // сверху не влезает: пробуем сбоку от головы
        const sideTop = Math.max(minTop, Math.min(SH - bh - pad, headTop + tagH + headH * 0.3 - bh / 2));
        const rightRoom = SW - (hx + hw / 2) - pad, leftRoom = hx - hw / 2 - pad;
        if (Math.max(rightRoom, leftRoom) >= bw + gap) {
          top = sideTop;
          left = rightRoom >= leftRoom ? hx + hw / 2 + gap : hx - hw / 2 - gap - bw;
          tip = [rightRoom >= leftRoom ? hx + hw / 2 - 2 : hx - hw / 2 + 2, headTop + tagH + headH * 0.35];
        } else {
          top = minTop;
          tip = [hx, Math.max(top + bh + 4, headTop - 2)];
        }
      }
      top = fit(top);
      bubble.style.left = left + "px";
      bubble.style.top = top + "px";
      // хвостик: основание на краю пузыря, ближайшем к голове
      const cx = Math.min(Math.max(tip[0], left + 16), left + bw - 16);
      const cy = Math.min(Math.max(tip[1], top + 14), top + bh - 14);
      if (tip[1] > top + bh) base = [[cx - 11, top + bh - 4], [cx + 3, top + bh - 4]];
      else if (tip[0] > left + bw) base = [[left + bw - 4, cy - 10], [left + bw - 4, cy + 10]];
      else base = [[left + 4, cy - 10], [left + 4, cy + 10]];
      tail.setAttribute("viewBox", `0 0 ${SW} ${SH}`);
      tailPoly.setAttribute("points", `${base[0][0]},${base[0][1]} ${tip[0]},${tip[1]} ${base[1][0]},${base[1][1]}`);
      tail.removeAttribute("hidden");
    }
    if (window.ResizeObserver) new ResizeObserver(() => { if (playing) place(); }).observe(stage);

    // ---------- навигация ----------
    // Звуки кадра: явные из sfx, от эффектов и от действий героев. Играют и при «меньше движения».
    function beatSounds(b) {
      const list = [];
      if (b.sfx) list.push(...String(b.sfx).split(/\s+/));
      st.fx.forEach(([name]) => list.push(name));
      if (st.zoom != null) list.push("zoom");
      let acts = b.do || [];
      if (typeof acts === "string") acts = acts.split(";");
      acts.forEach((x) => {
        const [aid, verb] = Array.isArray(x) ? x : x.trim().split(/\s+/);
        if (verb === "enter" || verb === "exit") list.push(aid === "glitch" ? "whoosh" : "steps");
        else if (verb === "jump" || verb === "bounce") list.push(verb);
        else if (verb === "as" || verb === "emo") list.push("pop");
        else if (verb === "shake" && !list.includes("thump")) list.push("thump");
      });
      // не больше 3 разных звуков за кадр, с небольшим разносом
      [...new Set(list)].slice(0, 3).forEach((n, k) => setTimeout(() => SFX.play(n), 40 + k * 140));
    }
    let loudNow = false;
    function go(i, animate, loud) {
      idx = i;
      const b = beats[i];
      fxEl.textContent = "";
      apply(b);
      render(animate);
      loudNow = !!loud;
      if (loud) beatSounds(b);
      speech(b, !animate);
      const need = needsPick(i);
      // без веток это ровно «i + 1 / всего кадров», как раньше
      countEl.textContent = path.length + " / " + (path.length + remaining(i));
      const end = !need && after(i, picks[i]) < 0;
      atEnd = end;
      prevBtn.disabled = path.length <= 1;
      skipBtn.hidden = end || (need && !!b.required);
      nextBtn.disabled = need;
      nextBtn.innerHTML = end ? "Ещё раз" : need ? "Выбери ответ" : "Дальше &rarr;";
      nextBtn.setAttribute("aria-label", end ? "Смотреть ещё раз" : need ? "Сначала выбери ответ" : "Дальше");
      hint.textContent = need ? hintPick(b.choice.length) : HINT;
      bar.classList.toggle("fresh", path.length <= 2 || need);
      root.classList.toggle("st-asking", need);
      root.classList.toggle("st-end", end);
      if (end) store(SEEN + id, "1");
      // вопрос с клавиатуры: фокус на выбранный (или первый) вариант
      if (b.choice && !choicesEl.hidden && root.contains(document.activeElement)) {
        const btns = optButtons();
        const f = btns[picks[i] != null ? picks[i] : 0];
        if (f) f.focus({ preventScroll: true });
      }
      // если шрифт ещё грузится или менялась вёрстка, пересчитаем место пузыря
      requestAnimationFrame(place);
    }
    function reset() {
      gen++;
      clearTimeout(typing); typing = null;
      picking = false;
      st = fresh(); bgSpec = null;
      for (const k in views) { views[k].el.remove(); delete views[k]; }
      fxEl.textContent = "";
      world.classList.remove("zoomed");
    }
    // Собрать состояние последнего кадра пути с нуля: фон, места, спрайты. Без анимаций.
    function rebuild() {
      reset();
      for (let k = 0; k < path.length - 1; k++) apply(beats[path[k]]);
      go(path[path.length - 1], false);
    }
    function start() {
      reset();
      playing = true;
      picks = {};
      path = [skipIfs(0) < 0 ? 0 : skipIfs(0)];
      cover.hidden = true;
      bar.hidden = false;
      root.classList.add("st-playing");
      SFX.unlock();
      SFX.play("next");
      go(path[0], !reduced(), true);
      stage.focus({ preventScroll: true });
    }
    function next() {
      if (!playing) return;
      SFX.unlock();
      if (finishTyping()) return;
      if (needsPick(idx)) { nudge(); return; }
      const j = after(idx, picks[idx]);
      if (j >= 0) { SFX.play("next"); path.push(j); go(j, !reduced(), true); }
    }
    function prev() {
      if (!playing || path.length <= 1) return;
      SFX.unlock();
      SFX.play("back");
      path.pop();
      rebuild();
    }
    // Пропуск: до конца, но остановиться на обязательном вопросе без ответа.
    function skip() {
      if (!playing) return;
      SFX.unlock();
      SFX.play("whoosh");
      let i = idx, guard = 0;
      while (guard++ < beats.length * 4) {
        if (needsPick(i) && beats[i].required) break;
        const j = after(i, picks[i]);
        if (j < 0) break;
        path.push(j);
        i = j;
      }
      rebuild();
      if (needsPick(idx)) { const f = optButtons()[0]; if (f) f.focus({ preventScroll: true }); }
      else nextBtn.focus({ preventScroll: true });
    }

    $(".st-play").addEventListener("click", (e) => { e.stopPropagation(); start(); });
    skipBtn.addEventListener("click", skip);
    nextBtn.addEventListener("click", () => { if (atEnd && !typing) start(); else next(); });
    prevBtn.addEventListener("click", prev);
    let swiped = false;
    stage.addEventListener("click", () => { if (swiped) { swiped = false; return; } next(); });
    let sx = 0, sy = 0;
    stage.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (!playing) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        swiped = true;
        setTimeout(() => { swiped = false; }, 400);
        if (dx < 0) next(); else prev();
      }
    });
    root.addEventListener("keydown", (e) => {
      if (e.target.closest("button") && (e.key === " " || e.key === "Enter")) return;
      if (!playing) {
        if (e.target === stage && (e.key === " " || e.key === "Enter")) { e.preventDefault(); start(); }
        return;
      }
      const b = beats[idx];
      if (b && b.choice && !choicesEl.hidden && !e.altKey && !e.ctrlKey && !e.metaKey) {
        // цифры выбирают вариант; стрелки ходят по вариантам, когда фокус на них (или ответа ещё нет)
        if (/^[1-9]$/.test(e.key) && Number(e.key) <= b.choice.length) { e.preventDefault(); pick(Number(e.key) - 1); return; }
        const btns = optButtons(), at = btns.indexOf(document.activeElement);
        const onOpt = at >= 0, step = { ArrowDown: 1, ArrowUp: -1, ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (step && (onOpt || ((e.key === "ArrowDown" || e.key === "ArrowUp") && needsPick(idx)))) {
          e.preventDefault();
          const n = btns.length, to = onOpt ? (at + step + n) % n : step > 0 ? 0 : n - 1;
          if (btns[to]) btns[to].focus({ preventScroll: true });
          return;
        }
      }
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    });

    // Обложка: фон первого кадра и герои первой серии.
    st = fresh();
    const firstBg = (beats.find((b) => b.bg) || {}).bg || "street";
    bgEl.innerHTML = bgSVG(firstBg);
    if (store(SEEN + id) === "1") { $(".st-seen").hidden = false; $(".st-play").textContent = "Смотреть ещё раз"; }
    // С ветками число кадров зависит от выборов: показываем примерное по первым вариантам.
    const n0 = branchy ? (() => { path = [Math.max(0, skipIfs(0))]; const n = 1 + remaining(path[0]); path = []; return n; })() : beats.length;
    const sub = (branchy ? "около " : "") + n0 + " " + plural(n0, "кадр", "кадра", "кадров") +
      (beats.some((b) => b.choice) ? " · с выбором" : "");
    $("[data-cover-art]").outerHTML = `<p class="st-cover-title">${esc(story.title || "")}</p><p class="st-cover-sub">${esc(sub)}</p>`;
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

  window.Story = {
    mount, CAST, BG: Object.keys(BG), seen: (id) => store(SEEN + id) === "1",
    // ответы на выборы сценок: Story.choice("l04-liked") → "yes" | null
    choices: loadChoices,
    choice: (k) => { const v = loadChoices()[k]; return v == null ? null : String(v); },
    forgetChoices: () => store(CHOICES, "{}"),
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mount());
  else mount();
})();
