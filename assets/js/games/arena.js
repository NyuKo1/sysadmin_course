// Арена: игры сезона 2. Уровни с растущей сложностью, комбо, жизни, бонус за время, рейтинг.
// Работает пальцем (телефон), мышью и с клавиатуры: перетаскивание на pointer events,
// а если тянуть неудобно, можно нажать на предмет и потом на место, куда его поставить.
//
// На странице: <div class="minigame" data-config="l05-compat"></div>
// (engine.js такие игры пропускает, если id есть в Arena.data). Можно и <div data-arena="id">.
// Победа: когда пройдено passLevel уровней, на корне игры всплывает событие
//   minigame:won  (bubbles, detail { id, score }), как у старого движка, lesson.js открывает следующую часть.
// В конце забега: Leaderboard.submit(id, score, { level, time, mistakes }), если leaderboard.js подключён.
//
// ================= ФОРМАТ КОНФИГА =================
// Arena.data[id] = {
//   kind: "slots" | "assembly" | "detective",  // какой движок игры
//   title, intro,          // заголовок и вступление (можно HTML)
//   gif: "think",          // гифка из assets/gif на заставке
//   lives: 4,              // бюджет ошибок на весь забег
//   passLevel: 2,          // сколько уровней пройти для зачёта (minigame:won)
//   levels: [{             // уровни по порядку, каждый сложнее
//     name, goal,          // название и задача (HTML)
//     brief: ["..."],      // пункты брифинга перед стартом
//     time: 120,           // секунд, пока капает бонус за время (по умолчанию 120)
//     limit: false,        // true: время жёсткое, вышло = минус жизнь и уровень заново
//     timeBonus: 3,        // очков за каждую оставшуюся секунду
//     ...                  // поля конкретного движка (см. ниже)
//   }],
//   ...                    // данные конкретного движка
// }
// Очки: api.hit(n) даёт n × множитель серии (x1, x1.25 … до x3), ошибка сбрасывает серию.
// За уровень: + бонус за время + «без ошибок» (100 × номер уровня) + доп. бонусы движка.
//
// kind "slots": собери набор из предметов в слоты (сборка ПК, рюкзак, сеть…).
//   cats:  [{ id, label }]                    вкладки магазина
//   slots: [{ id, label, cat, optional }]     слоты сборки; предмет кладётся в слот своей категории
//   parts: [{ id, cat, name, price, tags, from }]  from: с какого уровня появляется в магазине
//   checks(build, ctx) → [{ sev: "err"|"warn", text, why, slots: [...] }]   проблемы совместимости
//   power(build) → число, capacity(build) → число|0   для шкалы «нагрузка/мощность» (необязательно)
//   уровень: budget, hints: "live" (проблемы видны сразу) | "quiet" (только после проверки),
//            need(build, ctx) → такие же проблемы, условия заказа; reward: очки за верную сборку
//   build[slotId] = part; ctx = { level, total, power, capacity }
//
// kind "assembly": собери по шагам на сцене (SVG).
//   scene: { svg: "<g>…</g>", views: { case: "0 0 320 400", board: "…" }, start: "case", viewNames: {case:"Корпус"} }
//     в svg: data-target="id" (куда бросать или нажимать, data-label для подсказки),
//            data-when="flag|view:board&!other" (показывать, когда условие верно; флаги = id выполненных шагов)
//   items: { id: { label, icon: "<svg…>", rotate: true } }
//   steps: [{ id, title, item?, target, need: ["id"…] | "*", view, hint, early, wrong: { targetId: "почему" },
//             rotate: 0, rotateWhy, choice: { q, options: [{ t, ok, why }] },
//             map: { title, text, zones: [{ id, silk, pins, row, col }], chips: [{ id, label, zone, why }], legend } }]
//     шаг без item выполняется нажатием на target. need "*": все остальные шаги уровня.
//   уровень: steps: [ids] | "all", pre: [ids уже сделано], hints: "guided" | "list" | "none", labels: true|false, view: стартовый вид
//
// kind "detective": диагностика по уликам.
//   reach: ["off","power","post","screen","os","ok"]  докуда доходит система (по порядку)
//   checks: [{ id, label, verb, cost (мин), needs: reach, normal, blocked }]
//   faults: [{ id, name, reach, group, complaint, clues: { checkId: текст }, fix, looks, led, screen }]
//   reachText: { reach: текст при включении }, scene(state) → SVG картинки
//   уровень: cases, faults: 1|2, pool: [faultIds], options: сколько вариантов причины показать
// ===================================================
(function () {
  const A = (window.Arena = window.Arena || {});
  A.data = A.data || {};
  A.kinds = A.kinds || {};

  const GIF = (name) => (document.documentElement.dataset.root || "./") + "assets/gif/" + name + ".gif";
  const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
    return null;
  }

  const U = (A.util = {
    rand: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])),
    num: (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " "),
    clock: (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); },
  });

  // ---------- звук ----------
  // Свой маленький синтезатор (как в story.js). Выключатель общий с комиксами: localStorage "story-sound".
  const SND = (A.sound = (function () {
    const KEY = "story-sound";
    let ctx = null, master = null;
    const isOn = () => store(KEY) !== "0";
    function unlock() {
      if (!isOn()) return null;
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.18;
          master.connect(ctx.destination);
        }
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
      } catch (e) { ctx = null; }
      return ctx;
    }
    function tone(f, dur, type, vol, to, delay) {
      if (!isOn() || !ctx || ctx.state === "closed") return;
      const t = ctx.currentTime + (delay || 0);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    }
    const LIB = {
      click: () => tone(1300, 0.03, "square", 0.04),
      pick: () => { tone(660, 0.05, "triangle", 0.08, 990); },
      drop: () => tone(240, 0.07, "square", 0.05, 120),
      hit: (n) => { const b = 520 * Math.pow(1.06, Math.min(n || 0, 12)); tone(b, 0.07, "square", 0.05); tone(b * 1.5, 0.1, "square", 0.045, 0, 0.07); },
      miss: () => { tone(190, 0.28, "sawtooth", 0.08, 80); },
      level: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.3 : 0.1, "square", 0.05, 0, i * 0.09)),
      win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i === 4 ? 0.45 : 0.12, "square", 0.05, 0, i * 0.1)); },
      lose: () => [392, 370, 349, 311].forEach((f, i) => tone(f, 0.22, "triangle", 0.07, 0, i * 0.2)),
      tick: () => tone(1800, 0.02, "square", 0.025),
    };
    ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, unlock, { passive: true }));
    return {
      get on() { return isOn(); },
      set(v) { store(KEY, v ? "1" : "0"); if (v) unlock(); },
      play(name, arg) { try { unlock(); if (LIB[name]) LIB[name](arg); } catch (e) { /* звук не обязателен */ } },
    };
  })());

  // ---------- перетаскивание с запасным «нажми-нажми» ----------
  // o: { item: селектор предметов, target: селектор мест, onDrop(item, target, how), onTap(target), onSelect(item|null),
  //      spring: селектор кнопок, которые срабатывают, если подержать над ними предмет }
  A.dnd = function (root, o) {
    let sel = null, drag = null, skipUntil = 0, skipEl = null, raf = 0;
    function setSel(it) {
      if (sel) { sel.classList.remove("ar-sel"); sel.setAttribute("aria-pressed", "false"); }
      sel = it || null;
      if (sel) { sel.classList.add("ar-sel"); sel.setAttribute("aria-pressed", "true"); SND.play("pick"); }
      root.classList.toggle("ar-picking", !!sel);
      if (o.onSelect) o.onSelect(sel);
    }
    function under(x, y) { return document.elementFromPoint(x, y); }
    function targetAt(x, y) {
      const h = under(x, y);
      const t = h && h.closest && h.closest(o.target);
      return t && root.contains(t) ? t : null;
    }
    function drop(it, t, how) { setSel(null); if (t && it.isConnected) o.onDrop(it, t, how); }
    function hover() {
      if (!drag || !drag.on) return;
      const t = targetAt(drag.x, drag.y);
      if (t !== drag.over) {
        if (drag.over) drag.over.classList.remove("ar-over");
        if (t) t.classList.add("ar-over");
        drag.over = t;
      }
      if (o.spring) {
        const h = under(drag.x, drag.y);
        const sp = h && h.closest && h.closest(o.spring);
        if (sp !== drag.spring) { drag.spring = sp; drag.st = Date.now(); }
        else if (sp && Date.now() - drag.st > 450) { drag.st = Infinity; sp.click(); }
      }
    }
    function loop() {
      if (!drag || !drag.on) return;
      const m = 48;
      if (!o.noScroll) {
        if (drag.y < m) window.scrollBy(0, -9);
        else if (drag.y > window.innerHeight - m) window.scrollBy(0, 9);
      }
      hover();
      raf = requestAnimationFrame(loop);
    }
    function begin() {
      drag.on = true;
      const r = drag.it.getBoundingClientRect();
      const g = drag.it.cloneNode(true);
      g.classList.add("ar-ghost");
      g.classList.remove("ar-sel");
      g.removeAttribute("id");
      g.setAttribute("aria-hidden", "true");
      g.style.width = r.width + "px";
      g.style.height = r.height + "px";
      drag.dx = Math.min(drag.x0 - r.left, r.width);
      drag.dy = Math.min(drag.y0 - r.top, r.height);
      document.body.appendChild(g);
      drag.ghost = g;
      if (sel !== drag.it) setSel(drag.it);
      drag.it.classList.add("ar-dragging");
      root.classList.add("ar-drag");
      place();
      loop();
    }
    function place() {
      const g = drag.ghost;
      if (g) g.style.transform = `translate(${drag.x - drag.dx}px, ${drag.y - drag.dy}px)`;
    }
    function end(e, cancel) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const d = drag;
      drag = null;
      cancelAnimationFrame(raf);
      if (!d.on) return;
      d.ghost.remove();
      d.it.classList.remove("ar-dragging");
      if (d.over) d.over.classList.remove("ar-over");
      root.classList.remove("ar-drag");
      // браузер пришлёт click по перетащенному предмету сразу после отпускания: его пропускаем
      skipUntil = Date.now() + 400;
      skipEl = d.it;
      const t = cancel ? null : targetAt(d.x, d.y);
      if (t) drop(d.it, t, "drag");
      else { setSel(null); SND.play("drop"); }
    }
    root.addEventListener("pointerdown", (e) => {
      if (e.button > 0 || drag) return;
      const it = e.target.closest(o.item);
      if (!it || !root.contains(it) || it.disabled || it.getAttribute("aria-disabled") === "true" || e.target.closest("[data-nodrag]")) return;
      drag = { it, id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, on: false, over: null, ghost: null, spring: null, st: 0 };
      try { it.setPointerCapture(e.pointerId); } catch (err) { /* старый браузер */ }
    });
    root.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (!drag.on) {
        if (Math.hypot(drag.x - drag.x0, drag.y - drag.y0) < 7) return;
        begin();
      }
      e.preventDefault();
      place();
      hover();
    });
    root.addEventListener("pointerup", (e) => end(e, false));
    root.addEventListener("pointercancel", (e) => end(e, true));
    root.addEventListener("lostpointercapture", (e) => { if (drag && drag.on && e.pointerId === drag.id && !drag.it.isConnected) end(e, true); });
    root.addEventListener("click", (e) => {
      if (Date.now() < skipUntil && skipEl && skipEl.contains(e.target)) return;
      if (e.target.closest("[data-nodrag]")) return;
      const it = e.target.closest(o.item);
      if (it && root.contains(it)) {
        if (it.disabled || it.getAttribute("aria-disabled") === "true") return;
        setSel(sel === it ? null : it);
        return;
      }
      const t = e.target.closest(o.target);
      if (t && root.contains(t)) {
        if (sel) drop(sel, t, "tap");
        else if (o.onTap) o.onTap(t);
      }
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && sel) { setSel(null); return; }
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = e.target;
      if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) return;
      if ((el.matches && (el.matches(o.target) || el.matches(o.item)))) {
        e.preventDefault();
        el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    });
    return { clear: () => setSel(null), get selected() { return sel; } };
  };

  // ---------- модальное окно ----------
  const openModals = new Set();
  A.modal = function (html, opt) {
    opt = opt || {};
    const back = document.createElement("div");
    back.className = "ar-modal";
    back.innerHTML = `<div class="ar-modal-box" role="dialog" aria-modal="true" tabindex="-1">${opt.closable === false ? "" : `<button class="ar-modal-x" type="button" aria-label="Закрыть" data-close>×</button>`}${html}</div>`;
    const host = opt.host || document.body;
    host.appendChild(back);
    const box = back.querySelector(".ar-modal-box");
    const prev = document.activeElement;
    const m = {
      el: box,
      close() {
        if (!back.isConnected) return;
        back.remove();
        openModals.delete(m);
        if (opt.onClose) opt.onClose();
        if (prev && prev.focus && prev.isConnected) try { prev.focus({ preventScroll: true }); } catch (e) { /* ничего */ }
      },
    };
    openModals.add(m);
    back.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || (e.target === back && opt.closable !== false)) m.close(); });
    back.addEventListener("keydown", (e) => { if (e.key === "Escape" && opt.closable !== false) m.close(); });
    setTimeout(() => { const f = box.querySelector("button:not([data-close]), [tabindex='0']") || box; try { f.focus({ preventScroll: true }); } catch (e) { /* ничего */ } }, 30);
    return m;
  };
  A.modal.closeAll = () => [...openModals].forEach((m) => m.close());

  // ================= оболочка игры =================
  function getBest(id) { return Number(store("best-" + id)) || 0; }
  function setBest(id, v) { if (v > getBest(id)) store("best-" + id, String(v)); }

  function Game(el) {
    const id = el.dataset.config || el.dataset.arena;
    const cfg = A.data[id];
    const kind = cfg && A.kinds[cfg.kind];
    if (!cfg || !kind) { el.innerHTML = `<p class="muted">Игра «${U.esc(id)}» не найдена.</p>`; return; }
    if (el.dataset.arenaMounted) return;
    el.dataset.arenaMounted = "1";
    el.classList.add("ar-game");
    const LV = cfg.levels;
    const LIVES = cfg.lives || 3;
    const PASS = Math.min(cfg.passLevel || LV.length, LV.length);
    let s = null, inst = null, timer = 0, runSeq = 0;

    const lb = () => window.Leaderboard;
    function whoLine() {
      const L = lb();
      if (!L) return "";
      const me = L.me && L.me();
      return me
        ? `<p class="muted ar-who">Играешь как <b>${U.esc(me.nick)}</b>. Результат уйдёт в рейтинг класса. <button class="linkbtn" data-act="signin">Сменить</button></p>`
        : `<p class="muted ar-who">Хочешь в рейтинг класса? <button class="linkbtn" data-act="signin">Войти по нику и PIN</button></p>`;
    }

    function intro() {
      stop();
      A.modal.closeAll();
      el.innerHTML = `
        <div class="game-intro ar-panel">
          <div class="game-intro-head">
            <img class="gif" src="${GIF(cfg.gif || "wave")}" alt="" width="96" height="96">
            <div>
              <span class="block-label game">Игра · ${LV.length} уровн${LV.length < 5 ? "я" : "ей"}</span>
              <h3>${cfg.title}</h3>
            </div>
          </div>
          <p>${cfg.intro}</p>
          <ol class="ar-levels">${LV.map((l, i) => `<li${i < PASS ? ' class="pass"' : ""}><b>${l.name}</b>${i === PASS - 1 ? ' <span class="ar-tag">зачёт</span>' : ""}</li>`).join("")}</ol>
          <p class="muted mono">Жизней: ${LIVES} · для зачёта пройди ${PASS} ${PASS === 1 ? "уровень" : PASS < 5 ? "уровня" : "уровней"} · рекорд: ${U.num(getBest(id))}</p>
          ${whoLine()}
          <div class="game-row"><button class="btn" data-act="start">Играть</button></div>
        </div>`;
    }

    function start() {
      s = { i: 0, score: 0, lives: LIVES, streak: 0, bestStreak: 0, mistakes: [], cleared: 0, won: false, t0: Date.now(), over: false };
      brief();
    }

    function brief(again) {
      stop();
      A.modal.closeAll();
      const L = LV[s.i];
      const t = L.time || 120;
      el.innerHTML = `
        <div class="game-intro ar-panel ar-brief">
          <span class="block-label game">Уровень ${s.i + 1} из ${LV.length}${s.i + 1 === PASS ? " · зачётный" : ""}</span>
          <h3>${L.name}</h3>
          ${again ? `<p class="ar-again">${again}</p>` : ""}
          <p>${L.goal}</p>
          ${L.brief && L.brief.length ? `<ul>${L.brief.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
          <p class="muted mono">${L.limit ? `Лимит времени: ${U.clock(t)}` : `Бонус за скорость: ${U.clock(t)}`} · очки: ${U.num(s.score)} · жизни: ${hearts()}</p>
          <div class="game-row"><button class="btn" data-act="go">Старт</button></div>
        </div>`;
      el.querySelector("[data-act=go]").focus({ preventScroll: true });
    }

    function hearts() {
      const n = Math.max(0, s.lives);
      return "♥".repeat(n) + "♡".repeat(Math.max(0, LIVES - n));
    }
    function mult() { return 1 + Math.min(Math.max(s.streak - 1, 0), 8) * 0.25; }

    function play() {
      stop();
      const L = LV[s.i];
      runSeq++;
      const run = runSeq;
      s.playing = true;
      s.lvScore = 0;
      s.lvMiss = 0;
      s.total = s.left = L.time || 120;
      s.lvStart = Date.now();
      el.innerHTML = `
        <div class="ar-play">
          <div class="ar-hud">
            <span>Ур. <b>${s.i + 1}</b>/${LV.length}</span>
            <span>Очки <b data-score>${U.num(s.score)}</b></span>
            <span class="ar-combo" data-combo hidden></span>
            <span class="ar-lives" data-lives aria-label="Жизни">${hearts()}</span>
            <span class="ar-clock${L.limit ? " limit" : ""}" data-clock>${U.clock(s.left)}</span>
            <button class="ar-snd" type="button" data-act="sound" aria-pressed="${SND.on}" aria-label="Звук" title="Звук">${SND.on ? "♪" : "×♪"}</button>
          </div>
          <div class="game-timer ar-timer"><i data-bar style="width:100%"></i></div>
          <div class="ar-goal"><b>${L.name}.</b> ${L.goal}</div>
          <div class="ar-stage"></div>
          <div class="ar-why" data-why aria-live="polite"></div>
        </div>`;
      const stage = el.querySelector(".ar-stage");
      inst = kind.mount(stage, L, makeApi(run, L), cfg) || null;
      timer = setInterval(tick, 1000);
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = 0;
      if (inst && inst.destroy) try { inst.destroy(); } catch (e) { /* ничего */ }
      inst = null;
    }

    function tick() {
      if (!s || !s.playing) return;
      s.left--;
      const L = LV[s.i];
      const c = el.querySelector("[data-clock]");
      const bar = el.querySelector("[data-bar]");
      if (c) c.textContent = s.left > 0 ? U.clock(s.left) : L.limit ? "0:00" : "без бонуса";
      if (bar) { bar.style.width = Math.max(0, (100 * s.left) / s.total) + "%"; bar.classList.toggle("low", s.left <= 15); }
      if (L.limit && s.left <= 10 && s.left > 0) SND.play("tick");
      if (L.limit && s.left <= 0) fail("Время вышло.");
    }

    function updHud() {
      const sc = el.querySelector("[data-score]");
      if (sc) sc.textContent = U.num(s.score);
      const l = el.querySelector("[data-lives]");
      if (l) { l.textContent = hearts(); l.setAttribute("aria-label", "Жизни: " + s.lives); }
      const c = el.querySelector("[data-combo]");
      if (c) {
        c.hidden = s.streak < 2;
        c.textContent = `x${mult().toFixed(2).replace(/0$/, "").replace(".", ",")} · серия ${s.streak}`;
        if (!reduced()) { c.classList.remove("ar-bump"); void c.offsetWidth; c.classList.add("ar-bump"); }
      }
    }

    function popup(text, bad) {
      if (reduced()) return;
      const hud = el.querySelector(".ar-hud");
      if (!hud) return;
      const p = document.createElement("span");
      p.className = "ar-popup" + (bad ? " bad" : "");
      p.textContent = text;
      hud.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }

    function say(text, cls, title) {
      const w = el.querySelector("[data-why]");
      if (!w) return;
      w.className = "ar-why " + (cls || "");
      w.innerHTML = (title ? `<b>${title}</b> ` : "") + text;
    }

    function makeApi(run, L) {
      const live = () => s && !s.over && s.playing && run === runSeq;
      return {
        level: L,
        index: s.i,
        cfg,
        util: U,
        sound: SND,
        dnd: A.dnd,
        modal: (html, o) => A.modal(html, o),
        get alive() { return live(); },
        get timeLeft() { return s.left; },
        hit(pts, text) {
          if (!live()) return 0;
          s.streak++;
          s.bestStreak = Math.max(s.bestStreak, s.streak);
          const g = Math.round(pts * mult());
          s.score += g;
          s.lvScore += g;
          updHud();
          popup("+" + g);
          if (text) say(text, "ok");
          SND.play("hit", s.streak);
          return g;
        },
        miss(why, o) {
          if (!live()) return;
          o = o || {};
          s.streak = 0;
          if (!o.noLife) {
            s.lives--;
            s.lvMiss++;
            s.mistakes.push({ what: o.what || L.name, why });
            popup("−♥", true);
            el.classList.remove("shake");
            void el.offsetWidth;
            el.classList.add("shake");
            setTimeout(() => el.classList.remove("shake"), 350);
          }
          updHud();
          say(why, "bad", o.title || (o.noLife ? "Осторожно:" : "Ошибка:"));
          SND.play("miss");
          if (s.lives <= 0) {
            s.playing = false;
            stop();
            setTimeout(() => { A.modal.closeAll(); finish(); }, 1800);
          }
        },
        info(text, title) { if (live()) say(text, "info", title); },
        done(extra) { if (live()) levelDone(extra || []); },
        fail(why) { if (live()) fail(why); },
      };
    }

    function fail(why) {
      s.playing = false;
      stop();
      A.modal.closeAll();
      s.score -= s.lvScore;
      s.lives--;
      s.streak = 0;
      s.mistakes.push({ what: LV[s.i].name, why });
      SND.play("miss");
      if (s.lives <= 0) { finish(); return; }
      brief(`${why} Минус жизнь, очки уровня сгорели. Попробуй ещё раз.`);
    }

    function levelDone(extra) {
      s.playing = false;
      stop();
      A.modal.closeAll();
      const L = LV[s.i];
      const rows = [["Очки за ходы", s.lvScore]];
      extra.forEach((e) => rows.push([e.label, Math.max(0, Math.round(e.pts))]));
      const tb = Math.max(0, s.left) * (L.timeBonus || 3);
      rows.push(["Бонус за время", tb]);
      const clean = s.lvMiss === 0 ? (L.clean !== undefined ? L.clean : 100 * (s.i + 1)) : 0;
      rows.push(["Без ошибок", clean]);
      const add = rows.slice(1).reduce((a, r) => a + r[1], 0);
      s.score += add;
      s.cleared = Math.max(s.cleared, s.i + 1);
      const last = s.i + 1 >= LV.length;
      const gotPass = s.cleared >= PASS && !s.won;
      if (gotPass) s.won = true;
      SND.play(last || gotPass ? "win" : "level");
      const secs = Math.round((Date.now() - s.lvStart) / 1000);
      el.innerHTML = `
        <div class="game-intro ar-panel">
          <div class="game-intro-head">
            <img class="gif" src="${GIF(gotPass || last ? "party" : "bit-cool")}" alt="" width="96" height="96">
            <div>
              <span class="block-label game">Уровень ${s.i + 1} пройден</span>
              <h3>${L.name}</h3>
            </div>
          </div>
          <table class="ar-score">${rows.map((r) => `<tr><td>${r[0]}</td><td>+${U.num(r[1])}</td></tr>`).join("")}
            <tr class="sum"><td>Всего очков</td><td>${U.num(s.score)}</td></tr></table>
          <p class="muted mono">Время: ${U.clock(secs)} · ошибок на уровне: ${s.lvMiss} · жизни: ${hearts()}</p>
          ${gotPass ? `<p class="ar-pass">Зачёт по игре получен! Можно играть дальше ради рекорда и рейтинга.</p>` : ""}
          <div class="game-row">
            ${last ? `<button class="btn" data-act="finish">К итогам</button>` : `<button class="btn" data-act="next">Уровень ${s.i + 2}: ${LV[s.i + 1].name}</button><button class="btn ghost" data-act="finish">Закончить и сохранить</button>`}
          </div>
        </div>`;
      el.querySelector(".btn").focus({ preventScroll: true });
      if (gotPass) el.dispatchEvent(new CustomEvent("minigame:won", { bubbles: true, detail: { id, score: s.score } }));
    }

    function finish() {
      if (!s || s.over) return;
      s.over = true;
      s.playing = false;
      stop();
      A.modal.closeAll();
      const prev = getBest(id);
      setBest(id, s.score);
      const time = Math.round((Date.now() - s.t0) / 1000);
      const all = s.cleared >= LV.length;
      if (lb() && lb().submit) {
        try { lb().submit(id, s.score, { level: s.cleared, time, mistakes: s.mistakes.length }); } catch (e) { /* рейтинг не обязателен */ }
      }
      if (!s.won) SND.play("lose");
      const review = s.mistakes.map((m) => `<li><b>${m.what}:</b> ${m.why}</li>`).join("");
      el.innerHTML = `
        <div class="game-intro ar-panel">
          <div class="game-intro-head">
            <img class="gif" src="${GIF(all ? "party" : s.won ? "bit-cool" : "sad")}" alt="" width="96" height="96">
            <div>
              <span class="block-label game">${all ? "Все уровни пройдены" : s.won ? "Зачёт получен" : "Игра окончена"}</span>
              <h3>${cfg.title}</h3>
            </div>
          </div>
          <p class="ar-final">Очки: <b>${U.num(s.score)}</b>${s.score > prev ? ` <span class="ar-tag">новый рекорд</span>` : ""}</p>
          <p class="muted mono">Пройдено уровней: ${s.cleared}/${LV.length} · рекорд: ${U.num(getBest(id))} · лучшая серия: ${s.bestStreak} · время: ${U.clock(time)}</p>
          ${s.won ? "" : `<p>Для зачёта нужно пройти ${PASS} ${PASS === 1 ? "уровень" : "уровня"}. Разбери ошибки ниже и попробуй ещё раз: задания будут другими.</p>`}
          ${review ? `<p><b>Разбор ошибок</b></p><ol class="review">${review}</ol>` : `<p>Ни одной ошибки. Бит доволен.</p>`}
          ${whoLine()}
          ${lb() && lb().render ? `<div class="ar-lb" data-leaderboard="${id}" data-compact="1"></div>` : ""}
          <div class="game-row"><button class="btn" data-act="start">Ещё раз</button></div>
        </div>`;
      const box = el.querySelector(".ar-lb");
      if (box) try { lb().render(box); } catch (e) { box.remove(); }
    }

    el.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]");
      if (!a || !el.contains(a)) return;
      const act = a.dataset.act;
      if (act === "start") start();
      else if (act === "go") play();
      else if (act === "next") { s.i++; brief(); }
      else if (act === "finish") finish();
      else if (act === "sound") {
        SND.set(!SND.on);
        a.textContent = SND.on ? "♪" : "×♪";
        a.setAttribute("aria-pressed", String(SND.on));
      } else if (act === "signin" && lb() && lb().signIn) {
        Promise.resolve(lb().signIn()).then(() => { const w = el.querySelector(".ar-who"); if (w) w.outerHTML = whoLine(); });
      }
    });

    intro();
  }

  // ================= kind: slots (собери совместимый набор) =================
  A.kinds.slots = {
    mount(root, L, api, cfg) {
      const n = api.index + 1;
      const parts = cfg.parts.filter((p) => (L.parts ? L.parts.includes(p.id) : (p.from || 1) <= n));
      const byId = {};
      parts.forEach((p) => (byId[p.id] = p));
      const cats = cfg.cats.filter((c) => parts.some((p) => p.cat === c.id));
      const build = {};
      const once = new Set();
      const live = (L.hints || "live") === "live";
      let tab = cats[0].id;
      let checked = false;

      root.innerHTML = `
        <div class="ar-sl">
          <div class="ar-sl-build">
            <div class="ar-meters">
              <div class="ar-meter" data-m="money"><div class="ar-meter-t"><span>Бюджет</span><b data-mv></b></div><i><em></em></i></div>
              ${cfg.power ? `<div class="ar-meter" data-m="power"><div class="ar-meter-t"><span>${cfg.powerLabel || "Питание"}</span><b data-mv></b></div><i><em></em></i></div>` : ""}
            </div>
            <div class="ar-slots">${cfg.slots.map((sl) => `<div class="ar-slot" data-target="${sl.id}" data-cat="${sl.cat}" tabindex="0" role="button" aria-label="${U.esc(sl.label)}"></div>`).join("")}</div>
            <div class="ar-probs" data-probs aria-live="polite"></div>
            <div class="game-row"><button class="btn" type="button" data-check>Собрать и проверить</button></div>
          </div>
          <div class="ar-sl-shop">
            <div class="ar-tabs" role="tablist">${cats.map((c) => `<button type="button" class="ar-tab" role="tab" data-tab="${c.id}">${c.label}</button>`).join("")}</div>
            <div class="ar-cards" data-cards></div>
          </div>
        </div>`;

      const sum = () => Object.values(build).reduce((a, p) => a + (p ? p.price : 0), 0);
      function ctx() {
        return { level: L, total: sum(), power: cfg.power ? cfg.power(build) : 0, capacity: cfg.capacity ? cfg.capacity(build) : 0 };
      }
      function problems() {
        const c = ctx();
        const out = [];
        cfg.slots.forEach((sl) => {
          if (!sl.optional && !build[sl.id]) out.push({ sev: "err", key: "empty-" + sl.id, text: `Пустой слот: ${sl.label.toLowerCase()}`, why: `В сборке не хватает: ${sl.label.toLowerCase()}.`, slots: [sl.id] });
        });
        if (L.budget && c.total > L.budget) out.push({ sev: "err", key: "budget", text: `Бюджет превышен на ${U.num(c.total - L.budget)} ₸`, why: `Заказчик дал ${U.num(L.budget)} ₸, а сборка стоит ${U.num(c.total)} ₸. Ищи, где переплата не даёт пользы.`, slots: [] });
        (cfg.checks ? cfg.checks(build, c) : []).forEach((p) => out.push(p));
        (L.need ? L.need(build, c) : []).forEach((p) => out.push(p));
        out.forEach((p) => { if (!p.key) p.key = p.text; });
        return out;
      }

      function renderSlots(probs) {
        const bad = new Set();
        const warn = new Set();
        if (live || checked) probs.forEach((p) => (p.slots || []).forEach((sid) => (p.sev === "err" ? bad : warn).add(sid)));
        root.querySelectorAll(".ar-slot").forEach((el) => {
          const sl = cfg.slots.find((x) => x.id === el.dataset.target);
          const p = build[sl.id];
          el.classList.toggle("full", !!p);
          el.classList.toggle("bad", bad.has(sl.id));
          el.classList.toggle("warn", !bad.has(sl.id) && warn.has(sl.id));
          el.innerHTML = `<span class="ar-slot-l">${sl.label}${sl.optional ? " <i>(можно пусто)</i>" : ""}</span>
            <span class="ar-slot-v">${p ? `${U.esc(p.name)} <i>${U.num(p.price)} ₸</i>` : "перетащи сюда"}</span>
            ${p ? `<button class="ar-x" type="button" data-nodrag data-remove="${sl.id}" aria-label="Убрать ${U.esc(p.name)}">×</button>` : ""}`;
        });
      }
      function renderMeters() {
        const c = ctx();
        const m = root.querySelector('[data-m="money"]');
        const r = L.budget ? c.total / L.budget : 0;
        m.querySelector("[data-mv]").textContent = `${U.num(c.total)} / ${U.num(L.budget)} ₸`;
        const em = m.querySelector("em");
        em.style.width = Math.min(100, r * 100) + "%";
        m.className = "ar-meter " + (r > 1 ? "bad" : r > 0.92 ? "warn" : "ok");
        const pw = root.querySelector('[data-m="power"]');
        if (pw) {
          const k = c.capacity ? c.power / c.capacity : 0;
          pw.querySelector("[data-mv]").textContent = c.capacity ? `≈ ${c.power} Вт из ${c.capacity} (${Math.round(k * 100)}%)` : `≈ ${c.power} Вт, БП не выбран`;
          pw.querySelector("em").style.width = (c.capacity ? Math.min(100, k * 100) : 0) + "%";
          const head = cfg.headroom || 1.3;
          pw.className = "ar-meter " + (!c.capacity ? "" : k > 1 ? "bad" : k > 1 / head ? "warn" : "ok");
        }
      }
      function renderProbs(probs) {
        const box = root.querySelector("[data-probs]");
        if (!live && !checked) { box.innerHTML = `<p class="muted">Подсказок о совместимости на этом уровне нет: смотри на характеристики и шкалы. Проверка покажет ошибки только после сборки.</p>`; return; }
        const list = probs.filter((p) => !p.key.startsWith("empty-"));
        box.innerHTML = list.length
          ? `<ul>${list.map((p) => `<li class="${p.sev}"><b>${p.sev === "err" ? "✗" : "!"}</b> ${p.text}</li>`).join("")}</ul>`
          : Object.keys(build).length ? `<p class="ok">✓ Конфликтов не видно</p>` : `<p class="muted">Начни с процессора или платы.</p>`;
      }
      function renderCards() {
        const box = root.querySelector("[data-cards]");
        box.innerHTML = parts.filter((p) => p.cat === tab).map((p) => {
          const inside = Object.values(build).includes(p);
          return `<button type="button" class="ar-item ar-card${inside ? " in" : ""}" data-part="${p.id}" aria-pressed="false">
            <b>${U.esc(p.name)}</b><span class="ar-tags">${p.tags || ""}</span><span class="ar-price">${U.num(p.price)} ₸${inside ? " · в сборке" : ""}</span></button>`;
        }).join("") || `<p class="muted">Пусто</p>`;
        root.querySelectorAll(".ar-tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === tab)));
      }
      function renderAll() {
        const probs = problems();
        renderSlots(probs);
        renderMeters();
        renderProbs(probs);
        renderCards();
        return probs;
      }

      function place(part, slotId) {
        let sl = cfg.slots.find((x) => x.id === slotId);
        if (!sl || sl.cat !== part.cat) {
          const same = cfg.slots.filter((x) => x.cat === part.cat);
          sl = same.find((x) => !build[x.id]) || same[0];
        }
        if (!sl) return;
        const before = new Set(problems().filter((p) => p.sev === "err").map((p) => p.key));
        build[sl.id] = part;
        checked = false;
        const probs = renderAll();
        const fresh = probs.filter((p) => p.sev === "err" && !before.has(p.key) && !p.key.startsWith("empty-") && p.key !== "budget");
        if (!live) { api.sound.play("drop"); return; }
        if (fresh.length) api.miss(fresh[0].why, { noLife: true, title: "Конфликт:" });
        else if (!once.has(part.id)) { once.add(part.id); api.hit(10, `${part.name} встал без конфликтов.`); }
        else api.sound.play("drop");
      }

      api.dnd(root, {
        item: ".ar-card",
        target: ".ar-slot",
        onSelect(it) {
          const cat = it && byId[it.dataset.part] && byId[it.dataset.part].cat;
          root.querySelectorAll(".ar-slot").forEach((s) => s.classList.toggle("want", !!cat && s.dataset.cat === cat));
        },
        onDrop(it, t) { const p = byId[it.dataset.part]; if (p) place(p, t.dataset.target); },
      });

      root.addEventListener("click", (e) => {
        const tb = e.target.closest("[data-tab]");
        if (tb) { tab = tb.dataset.tab; renderCards(); api.sound.play("click"); return; }
        const rm = e.target.closest("[data-remove]");
        if (rm) { delete build[rm.dataset.remove]; checked = false; renderAll(); api.sound.play("drop"); return; }
        if (e.target.closest("[data-check]")) {
          checked = true;
          const probs = renderAll();
          const errs = probs.filter((p) => p.sev === "err");
          if (errs.length) {
            api.miss(`${errs[0].why}${errs.length > 1 ? ` <span class="muted">(и ещё проблем: ${errs.length - 1}, список выше)</span>` : ""}`, { what: L.name, title: "Сборка не работает:" });
            return;
          }
          const c = ctx();
          api.hit(L.reward || 300, "Сборка совместима и подходит заказчику!");
          const left = L.budget ? Math.max(0, L.budget - c.total) : 0;
          setTimeout(() => api.done(L.budget ? [{ label: "Сэкономлено бюджета", pts: (200 * left) / L.budget }] : []), 700);
        }
      });

      renderAll();
      return {};
    },
  };

  // ================= kind: assembly (сборка по шагам на сцене) =================
  function evalWhen(expr, flags) {
    return expr.split("|").some((alt) => alt.split("&").every((t) => {
      t = t.trim();
      const neg = t[0] === "!";
      if (neg) t = t.slice(1);
      return neg ? !flags.has(t) : flags.has(t);
    }));
  }

  A.kinds.assembly = {
    mount(root, L, api, cfg) {
      const all = cfg.steps;
      const byId = {};
      all.forEach((st) => (byId[st.id] = st));
      const inLevel = new Set(!L.steps || L.steps === "all" ? all.map((x) => x.id) : L.steps);
      const pre = new Set(L.pre || []);
      const done = new Set(pre);
      const present = (sid) => inLevel.has(sid) || pre.has(sid);
      const pending = () => all.filter((x) => inLevel.has(x.id) && !done.has(x.id));
      const unmet = (st) => (st.need === "*"
        ? all.filter((x) => inLevel.has(x.id) && x.id !== st.id && !done.has(x.id)).map((x) => x.id)
        : (st.need || []).filter((x) => present(x) && !done.has(x)));
      const mode = L.hints || "guided";
      const views = cfg.scene.views;
      const vnames = cfg.scene.viewNames || {};
      let view = L.view && views[L.view] ? L.view : cfg.scene.start || Object.keys(views)[0];
      const rot = {};
      Object.keys(cfg.items).forEach((k) => { if (cfg.items[k].rotate) rot[k] = U.pick([90, 180, 270]); });
      const listOrder = U.shuffle(all.filter((x) => inLevel.has(x.id)).map((x) => x.id));

      root.innerHTML = `
        <div class="ar-as">
          <div class="ar-as-scene">
            <div class="ar-as-top">
              <div class="ar-views" role="group" aria-label="Вид">${Object.keys(views).map((v) => `<button type="button" class="ar-view" data-view="${v}">${vnames[v] || v}</button>`).join("")}</div>
              <span class="ar-as-left mono" data-left></span>
            </div>
            <div class="ar-scene-wrap"><svg class="ar-scene" xmlns="http://www.w3.org/2000/svg" viewBox="${views[view]}" preserveAspectRatio="xMidYMid meet">${cfg.scene.svg}</svg></div>
          </div>
          <div class="ar-as-side">
            <div class="ar-hint" data-hint></div>
            <div class="ar-tray" data-tray></div>
          </div>
        </div>`;
      const svg = root.querySelector(".ar-scene");
      svg.querySelectorAll("[data-target]").forEach((t) => {
        t.setAttribute("tabindex", "0");
        t.setAttribute("role", "button");
        t.setAttribute("aria-label", t.dataset.label || t.dataset.target);
        t.classList.add("ar-t");
      });
      if (!L.labels && L.labels !== undefined) svg.classList.add("no-labels");

      function setView(v) {
        if (!views[v] || v === view) return;
        view = v;
        api.sound.play("click");
        apply();
      }

      function nextStep() { return pending().find((x) => !unmet(x).length) || null; }

      function apply() {
        const flags = new Set([...done, "view:" + view, ...(L.flags || [])]);
        svg.setAttribute("viewBox", views[view]);
        svg.querySelectorAll("[data-when]").forEach((g) => { g.style.display = evalWhen(g.dataset.when, flags) ? "" : "none"; });
        root.querySelectorAll(".ar-view").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
        const nx = mode === "guided" ? nextStep() : null;
        svg.querySelectorAll(".ar-t").forEach((t) => t.classList.toggle("ar-next", !!nx && t.dataset.target === nx.target));
        // лоток с предметами
        const counts = {};
        pending().forEach((x) => { if (x.item) counts[x.item] = (counts[x.item] || 0) + 1; });
        const tray = root.querySelector("[data-tray]");
        const keep = tray.querySelector(".ar-sel");
        const selId = keep && keep.dataset.item;
        tray.innerHTML = Object.keys(cfg.items).filter((k) => counts[k]).map((k) => {
          const it = cfg.items[k];
          const r = rot[k] || 0;
          return `<div class="ar-tool-w"><div class="ar-item ar-tool${nx && nx.item === k ? " ar-next" : ""}" role="button" tabindex="0" data-item="${k}" aria-pressed="false" aria-label="${U.esc(it.label)}">
              <span class="ar-ico" style="transform:rotate(${r}deg)">${it.icon || ""}</span><span class="ar-tool-l">${it.label}</span>${counts[k] > 1 ? `<span class="ar-cnt">×${counts[k]}</span>` : ""}</div>
            ${it.rotate ? `<button type="button" class="ar-rot" data-nodrag data-rot="${k}" aria-label="Повернуть: ${U.esc(it.label)}" title="Повернуть на 90°">⟳ ${r}°</button>` : ""}</div>`;
        }).join("") || `<p class="muted">Все детали на месте.</p>`;
        if (selId) { const again = tray.querySelector(`[data-item="${selId}"]`); if (again) { again.classList.add("ar-sel"); again.setAttribute("aria-pressed", "true"); } }
        // подсказка
        const hint = root.querySelector("[data-hint]");
        const left = pending().length;
        root.querySelector("[data-left]").textContent = `осталось: ${left}`;
        if (mode === "guided" && nx) {
          const k = all.filter((x) => inLevel.has(x.id)).indexOf(nx) + 1;
          hint.innerHTML = `<b>Шаг ${k}:</b> ${nx.title}. <span class="muted">${nx.hint || ""}</span>`;
        } else if (mode === "list") {
          hint.innerHTML = `<b>Осталось сделать</b> (порядок думай сам):<ul class="ar-todo">${listOrder.filter((x) => !done.has(x)).map((x) => `<li>${byId[x].title}</li>`).join("")}</ul>`;
        } else {
          hint.innerHTML = `<b>Без подсказок.</b> Осталось действий: ${left}. Нажимай на детали сцены (рычаг, кнопки) и тащи предметы.`;
        }
      }

      function complete(st) {
        done.add(st.id);
        api.hit(st.pts || 20, st.ok || `${st.title}: готово.`);
        apply();
        if (!pending().length) setTimeout(() => api.done([]), 700);
      }

      function attempt(st) {
        const u = unmet(st);
        if (u.length) {
          api.miss(st.early || `Рано. Сначала: ${byId[u[0]].title.toLowerCase()}.`, { what: st.title, title: "Не по порядку:" });
          return;
        }
        if (st.rotate !== undefined && ((rot[st.item] || 0) % 360) !== st.rotate) {
          api.miss(st.rotateWhy || "Не та ориентация.", { what: st.title, title: "Не так:" });
          return;
        }
        if (st.choice) return askChoice(st);
        if (st.map) return askMap(st);
        complete(st);
      }

      function askChoice(st) {
        const opts = U.shuffle(st.choice.options);
        const m = api.modal(`<h3>${st.choice.q}</h3><div class="choices ar-choices">${opts.map((o, i) => `<button type="button" class="choice" data-i="${i}">${o.t}</button>`).join("")}</div>`);
        m.el.addEventListener("click", (e) => {
          const b = e.target.closest("[data-i]");
          if (!b) return;
          const o = opts[Number(b.dataset.i)];
          m.close();
          if (o.ok) complete(st);
          else api.miss(o.why, { what: st.title });
        });
      }

      function askMap(st) {
        const M = st.map;
        const labels = L.labels !== false;
        const placed = new Set();
        const chips = U.shuffle(M.chips);
        const cells = M.zones.slice().sort((a, b) => a.row - b.row || a.col - b.col);
        const m = api.modal(`
          <h3>${M.title}</h3>
          <p class="muted">${M.text}</p>
          <div class="ar-map" style="grid-template-columns:repeat(${Math.max(...M.zones.map((z) => z.col)) + 1},1fr)">
            ${cells.map((z) => `<div class="ar-zone${z.dead ? " dead" : ""}" ${z.dead ? "" : `data-target="${z.id}" tabindex="0" role="button" aria-label="${U.esc(labels ? z.silk : "пины " + z.pins)}"`} style="grid-row:${z.row + 1};grid-column:${z.col + 1}">
              <span class="ar-pins">${(z.pinsList || [1, 2]).map(() => "<i></i>").join("")}</span>
              <span class="ar-silk">${labels ? z.silk : z.pins}</span></div>`).join("")}
          </div>
          ${labels ? "" : `<p class="ar-legend">${M.legend}</p>`}
          <div class="ar-map-chips">${chips.map((c) => `<div class="ar-item ar-chip" role="button" tabindex="0" data-chip="${c.id}" aria-pressed="false">${c.label}</div>`).join("")}</div>`);
        api.dnd(m.el, {
          item: ".ar-chip",
          target: ".ar-zone[data-target]",
          noScroll: true,
          onDrop(it, t) {
            const c = M.chips.find((x) => x.id === it.dataset.chip);
            const z = M.zones.find((x) => x.id === t.dataset.target);
            if (!c || !z || t.classList.contains("full")) return;
            if (c.zone !== z.id) {
              api.miss(c.why || `${c.label} сидит на других пинах: сверься со схемой.`, { what: st.title });
              return;
            }
            placed.add(c.id);
            it.remove();
            t.classList.add("full");
            t.querySelector(".ar-silk").textContent = c.label;
            api.hit(10);
            if (placed.size === M.chips.length) { setTimeout(() => { m.close(); complete(st); }, 400); }
          },
        });
      }

      const D = api.dnd(root, {
        item: ".ar-tool",
        target: ".ar-t",
        spring: ".ar-view",
        onSelect(it) {
          if (!it || mode !== "guided") return;
          const st = pending().find((x) => x.item === it.dataset.item && !unmet(x).length) || pending().find((x) => x.item === it.dataset.item);
          if (st && st.view && st.view !== view) setView(st.view);
        },
        onDrop(it, t) {
          const itemId = it.dataset.item;
          const tid = t.dataset.target;
          const cands = pending().filter((x) => x.item === itemId);
          if (!cands.length) return;
          const st = cands.find((x) => x.target === tid && !unmet(x).length) || cands.find((x) => x.target === tid);
          if (!st) {
            const why = cands.map((x) => x.wrong && x.wrong[tid]).find(Boolean) || `${cfg.items[itemId].label} сюда не ставят. ${cands[0].where || ""}`;
            api.miss(why, { what: cands[0].title, title: "Не туда:" });
            return;
          }
          attempt(st);
        },
        onTap(t) {
          const tid = t.dataset.target;
          const cands = pending().filter((x) => !x.item && x.target === tid);
          if (!cands.length) { api.sound.play("click"); return; }
          attempt(cands.find((x) => !unmet(x).length) || cands[0]);
        },
      });

      root.addEventListener("click", (e) => {
        const v = e.target.closest(".ar-view");
        if (v) { setView(v.dataset.view); return; }
        const r = e.target.closest("[data-rot]");
        if (r) {
          const k = r.dataset.rot;
          rot[k] = ((rot[k] || 0) + 90) % 360;
          api.sound.play("click");
          const ico = root.querySelector(`[data-item="${k}"] .ar-ico`);
          if (ico) ico.style.transform = `rotate(${rot[k]}deg)`;
          r.textContent = `⟳ ${rot[k]}°`;
        }
      });

      apply();
      return { destroy() { D.clear(); } };
    },
  };

  // ================= kind: detective (диагностика по уликам) =================
  A.kinds.detective = {
    mount(root, L, api, cfg) {
      const R = cfg.reach;
      const rank = (r) => R.indexOf(r);
      const F = {};
      cfg.faults.forEach((f) => (F[f.id] = f));
      const pool = (L.pool || cfg.faults.map((f) => f.id)).map((x) => F[x]).filter(Boolean);
      const cases = [];
      const used = new Set();
      for (let i = 0; i < (L.cases || 2); i++) {
        let fresh = pool.filter((f) => !used.has(f.id));
        if (!fresh.length) fresh = pool;
        if ((L.faults || 1) >= 2) {
          let pair = null;
          for (let tries = 0; tries < 60 && !pair; tries++) {
            const a = U.pick(fresh);
            const later = pool.filter((b) => rank(b.reach) > rank(a.reach) && b.group !== a.group && b.id !== a.id);
            if (later.length) pair = [a, U.pick(later)];
          }
          if (!pair) pair = [U.pick(fresh)];
          pair.forEach((f) => used.add(f.id));
          cases.push(pair);
        } else {
          const f = U.pick(fresh);
          used.add(f.id);
          cases.push([f]);
        }
      }
      let ci = -1, c = null;

      root.innerHTML = `
        <div class="ar-dt">
          <div class="ar-dt-top">
            <div class="ar-dt-pic" data-pic></div>
            <div class="ar-dt-case">
              <p class="ar-dt-n" data-n></p>
              <p class="ar-dt-c" data-complaint></p>
              <p class="muted mono" data-spent></p>
            </div>
          </div>
          <ol class="ar-dt-log" data-log reversed aria-live="polite"></ol>
          <div class="game-row"><button type="button" class="btn" data-name>Назвать причину</button></div>
          <p class="ar-dt-sub">Проверки (каждая стоит времени, улика появится выше):</p>
          <div class="ar-dt-checks">${cfg.checks.map((k) => `<button type="button" class="ar-check" data-check="${k.id}"><span class="ar-verb">${k.verb || ""}</span>${k.label}<i>${k.cost} мин</i></button>`).join("")}</div>
        </div>`;

      const active = () => c.faults.filter((f) => !c.fixed.has(f.id)).sort((a, b) => rank(a.reach) - rank(b.reach));
      const reachNow = () => { const a = active(); return a.length ? a[0].reach : R[R.length - 1]; };

      function clue(k) {
        const r = reachNow();
        if (k.needs && rank(r) < rank(k.needs)) return k.blocked || (cfg.blocked && cfg.blocked[r]) || "Не получится: компьютер до этого не доходит.";
        for (const f of active()) if (f.clues && f.clues[k.id]) return f.clues[k.id];
        if (k.id === cfg.powerCheck) return (cfg.reachText && cfg.reachText[r]) || k.normal;
        return k.normal;
      }

      function draw() {
        const a = active();
        const d = a[0];
        const st = { reach: c.powered ? reachNow() : "off", powered: c.powered, led: c.powered && d ? d.led || "" : "", screen: c.powered ? (d && d.screen) || (cfg.screens && cfg.screens[reachNow()]) || "" : "" };
        root.querySelector("[data-pic]").innerHTML = cfg.scene ? cfg.scene(st) : "";
        root.querySelector("[data-spent]").textContent = `Потрачено: ${c.minutes} мин · проверок: ${c.used.size}`;
        root.querySelectorAll("[data-check]").forEach((b) => b.classList.toggle("used", c.used.has(b.dataset.check)));
      }

      function log(html, cls) {
        const li = document.createElement("li");
        li.className = cls || "";
        li.innerHTML = html;
        const ol = root.querySelector("[data-log]");
        ol.prepend(li);
        if (!reduced()) li.classList.add("pop");
      }

      function nextCase() {
        ci++;
        if (ci >= cases.length) { setTimeout(() => api.done([]), 700); return; }
        c = { faults: cases[ci], fixed: new Set(), used: new Set(), minutes: 0, powered: false };
        root.querySelector("[data-n]").innerHTML = `<b>Заявка ${ci + 1} из ${cases.length}</b>${c.faults.length > 1 ? ' <span class="ar-tag">неисправностей может быть больше одной</span>' : ""}`;
        root.querySelector("[data-complaint]").textContent = `«${c.faults.slice().sort((a, b) => rank(a.reach) - rank(b.reach))[0].complaint}»`;
        root.querySelector("[data-log]").innerHTML = "";
        draw();
      }

      function doCheck(id) {
        const k = cfg.checks.find((x) => x.id === id);
        if (!k) return;
        const first = !c.used.has(id);
        if (first) { c.used.add(id); c.minutes += k.cost; }
        if (id === cfg.powerCheck) c.powered = true;
        api.sound.play("click");
        log(`<b>${k.label}${first ? ` (+${k.cost} мин)` : ""}:</b> ${clue(k)}`);
        draw();
        const top = root.querySelector("[data-log]");
        if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
      }

      function askName() {
        const a = active();
        const n = Math.max(L.options || 6, a.length + 1);
        const others = U.shuffle(cfg.faults.filter((f) => !a.includes(f) && !c.fixed.has(f.id)));
        const list = U.shuffle([...a, ...others].slice(0, n));
        const m = api.modal(`<h3>В чём причина?</h3><p class="muted">Выбери одну. Ошибка стоит жизни.</p><div class="choices ar-choices one">${list.map((f) => `<button type="button" class="choice" data-f="${f.id}">${f.name}</button>`).join("")}</div>`);
        m.el.addEventListener("click", (e) => {
          const b = e.target.closest("[data-f]");
          if (!b) return;
          m.close();
          const f = F[b.dataset.f];
          if (!a.includes(f)) {
            api.miss(`Это не «${f.name}». ${f.looks}`, { what: `Заявка ${ci + 1}` });
            return;
          }
          c.fixed.add(f.id);
          const rest = active();
          log(`<b>✓ Причина: ${f.name}.</b> ${f.fix}`, "ok");
          if (rest.length) {
            api.hit(120, `Одна причина найдена. Включаем снова…`);
            c.powered = true;
            const pk = cfg.checks.find((x) => x.id === cfg.powerCheck);
            log(`<b>Включили снова:</b> ${clue(pk)}`, "info");
            root.querySelector("[data-complaint]").textContent = `«${rest[0].complaint}»`;
            draw();
            return;
          }
          const eff = Math.max(0, (L.base || 150) - c.minutes * 10);
          api.hit(200 + eff, `Заявка закрыта за ${c.minutes} мин.`);
          c.powered = true;
          draw();
          setTimeout(() => { if (api.alive) nextCase(); }, 900);
        });
      }

      root.addEventListener("click", (e) => {
        const b = e.target.closest("[data-check]");
        if (b) { doCheck(b.dataset.check); return; }
        if (e.target.closest("[data-name]")) askName();
      });

      nextCase();
      return {};
    },
  };

  A.mount = Game;
  A.owns = (id) => !!A.data[id];
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".minigame[data-config], [data-arena]").forEach((el) => {
      const id = el.dataset.config || el.dataset.arena;
      if (A.data[id]) Game(el);
    });
  });
})();
