// Игры урока 6 «Что бывает после кнопки»: четыре новых движка для арены (assets/js/games/arena.js).
// Подключать после arena.js. Конфиги игр лежат в assets/js/content/lesson06.js.
//
// kind "bootrun"  Порядок загрузки. Переставь устройства, нажми F10 и смотри, как плата перебирает их по очереди.
//   уровень: tasks: [{ say, devices: [{ id, kind, name, has, legacy, off }], order: [ids], csm, want, wantDev,
//                      needCsm, lock, menu: { vendor, key, setup, window, keys, list: [{ t, ok, why }] }, why: { has: текст } }]
//   kind устройства: usb | nvme | ssd | hdd | dvd | lan.  has: win | setup | linux | memtest | rescue | empty | data | pxe
//
// kind "guard"    Охранник: загрузчики (или запросы к TPM) едут по ленте к воротам. Пропусти или останови.
//   уровень: mode: "sb" | "tpm", count, speed (секунд до ворот), gap (секунд между предметами), pool: [{ t, s, badge, ok, why }]
//
// kind "uefi"     Симулятор настроек UEFI: вкладки, переключатели, ползунки, задания, F10 и перезагрузка.
//   cfg.settings: [{ id, tab, label, type: toggle|select|range|info, options, min, max, step, unit, help, lock(s), val(s) }]
//   cfg.defaults: { id: значение }, cfg.danger: [(s) => текст | null], cfg.model(s) → { temp, idle, perf, stable, need }
//   уровень: start: { id: значение }, tasks: [{ t, ok(s, st) }], tabs: [ids], stress: true, after: "wol"
//
// kind "flash"    Обновление BIOS. phase: pick (выбери файл) | prep (подготовка) | flash (босс: прошивка под атакой Глюка)
//                 | rescue (плата не стартует: Dual BIOS, Flashback, сервис)
(function () {
  const A = (window.Arena = window.Arena || {});
  A.kinds = A.kinds || {};
  A.data = A.data || {};
  const U = A.util;
  const SND = A.sound;
  const GIF = (name) => (document.documentElement.dataset.root || "./") + "assets/gif/" + name + ".gif";
  const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const esc = (s) => U.esc(s);

  // Таймеры, которые гасятся вместе с уровнем
  function Timers() {
    const set = new Set();
    let raf = new Set();
    return {
      after(ms, fn) { const t = setTimeout(() => { set.delete(t); fn(); }, ms); set.add(t); return t; },
      anim(ms, fn) { return this.after(reduced() ? Math.min(ms, 60) : ms, fn); },
      every(ms, fn) { const t = setInterval(fn, ms); set.add(t); return t; },
      frame(fn) { const id = requestAnimationFrame((ts) => { raf.delete(id); fn(ts); }); raf.add(id); return id; },
      clear() { set.forEach((t) => { clearTimeout(t); clearInterval(t); }); set.clear(); raf.forEach(cancelAnimationFrame); raf.clear(); },
    };
  }

  // Плавная перестановка: запомнить места, перерисовать, анимировать сдвиг (FLIP)
  function flip(box, sel, change) {
    const before = new Map();
    box.querySelectorAll(sel).forEach((el) => before.set(el.dataset.key, el.getBoundingClientRect().top));
    change();
    if (reduced()) return;
    box.querySelectorAll(sel).forEach((el) => {
      const was = before.get(el.dataset.key);
      if (was === undefined) return;
      const dy = was - el.getBoundingClientRect().top;
      if (!dy) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => { el.style.transition = "transform .28s cubic-bezier(.2,.8,.3,1.2)"; el.style.transform = ""; });
    });
  }

  // Разлёт на пиксели (для «остановленных» загрузчиков и ударов по Глюку)
  function burst(host, x, y, color, n) {
    if (reduced()) return;
    for (let i = 0; i < (n || 12); i++) {
      const p = document.createElement("i");
      p.className = "bx-px";
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.background = color || "#ff6b6b";
      p.style.setProperty("--dx", Math.cos(a) * d + "px");
      p.style.setProperty("--dy", Math.sin(a) * d + "px");
      host.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  }

  // ---------- иконки устройств ----------
  const ICO = {
    usb: `<svg viewBox="0 0 32 16"><rect x="1" y="3" width="20" height="10" rx="2" fill="#4a7bd0"/><rect x="21" y="5" width="10" height="6" fill="#c9d1d9"/><rect x="24" y="7" width="2" height="2" fill="#333"/><rect x="28" y="7" width="2" height="2" fill="#333"/><rect x="4" y="6" width="8" height="4" fill="#9fc2ff"/></svg>`,
    nvme: `<svg viewBox="0 0 32 16"><rect x="1" y="4" width="30" height="8" fill="#1f5c3a"/><rect x="5" y="5" width="7" height="6" fill="#111"/><rect x="14" y="5" width="6" height="6" fill="#111"/><rect x="22" y="5" width="6" height="6" fill="#111"/><rect x="28" y="5" width="3" height="6" fill="#e0a458"/></svg>`,
    ssd: `<svg viewBox="0 0 32 16"><rect x="3" y="2" width="26" height="12" rx="1" fill="#6b7480"/><rect x="6" y="5" width="14" height="6" fill="#c9d1d9"/><rect x="23" y="11" width="4" height="2" fill="#e0a458"/></svg>`,
    hdd: `<svg viewBox="0 0 32 16"><rect x="3" y="1" width="26" height="14" rx="1" fill="#8a929c"/><circle cx="13" cy="8" r="5" fill="#c9d1d9"/><circle cx="13" cy="8" r="1.5" fill="#555"/><rect x="18" y="4" width="8" height="2" fill="#555" transform="rotate(20 18 5)"/></svg>`,
    dvd: `<svg viewBox="0 0 32 16"><rect x="1" y="3" width="30" height="10" fill="#2a2f36"/><rect x="4" y="7" width="18" height="2" fill="#555"/><rect x="26" y="7" width="3" height="2" fill="#5cf29a"/></svg>`,
    lan: `<svg viewBox="0 0 32 16"><rect x="8" y="2" width="16" height="12" fill="#c9d1d9"/><rect x="11" y="5" width="10" height="7" fill="#333"/><rect x="13" y="12" width="6" height="2" fill="#333"/><rect x="1" y="7" width="7" height="2" fill="#e0a458"/></svg>`,
  };
  const HAS = {
    win: { t: "Windows 11", boot: true },
    win10: { t: "старая Windows 10", boot: true },
    setup: { t: "установщик Windows", boot: true },
    linux: { t: "Ubuntu Linux", boot: true },
    memtest: { t: "Memtest86 (проверка памяти)", boot: true },
    rescue: { t: "спасательная система", boot: true },
    empty: { t: "пусто", boot: false },
    data: { t: "фото, музыка, игры", boot: false },
    pxe: { t: "загрузка по сети", boot: false, net: true },
  };

  // Экран-заставка того, что загрузилось
  function splash(has) {
    switch (has) {
      case "win":
      case "win10": return `<div class="bx-os win"><div class="bx-winlogo"><i></i><i></i><i></i><i></i></div><div class="bx-dots"><i></i><i></i><i></i><i></i><i></i></div></div>`;
      case "setup": return `<div class="bx-os setup"><div class="bx-win-dlg"><b>Установка Windows</b><span>Язык: русский</span><span class="bx-fake-btn">Далее</span></div></div>`;
      case "linux": return `<div class="bx-os linux"><div class="bx-ubu"></div><div class="bx-dots"><i></i><i></i><i></i><i></i><i></i></div></div>`;
      case "memtest": return `<div class="bx-os memtest"><pre>Memtest86  v11
Тест 1 [Перемещение единиц] ........ OK
Тест 2 [Случайные числа] ...</pre><div class="bx-mbar"><i></i></div></div>`;
      case "rescue": return `<div class="bx-os rescue"><pre>Спасательная система
&gt; Копирую фото на внешний диск...</pre><div class="bx-mbar"><i></i></div></div>`;
      default: return `<div class="bx-os none"><pre>Reboot and Select proper Boot device
or Insert Boot Media in selected Boot device
and press a key_</pre></div>`;
    }
  }

  // ================= kind: bootrun =================
  A.kinds.bootrun = {
    mount(root, L, api) {
      const T = Timers();
      const tasks = L.tasks.slice();
      let ti = 0, task = null, order = [], dev = {}, csm = false, busy = false, tries = 0;

      root.innerHTML = `
        <div class="bx-boot">
          <div class="bx-monitor"><div class="bx-screen" data-scr></div><div class="bx-stand"></div></div>
          <div class="bx-side">
            <div class="bx-task" data-task></div>
            <div data-ui></div>
          </div>
        </div>`;
      const scr = root.querySelector("[data-scr]");
      const ui = root.querySelector("[data-ui]");
      const taskEl = root.querySelector("[data-task]");

      function load() {
        task = tasks[ti];
        dev = {};
        const devs = task.devices || [];
        devs.forEach((d) => (dev[d.id] = Object.assign({}, d)));
        order = (task.order || devs.map((d) => d.id)).slice();
        csm = !!task.csm;
        busy = false;
        tries = 0;
        taskEl.innerHTML = `<span class="bx-step">Задание ${ti + 1} из ${tasks.length}</span>${task.say}`;
        scr.innerHTML = `<div class="bx-idle"><span>${task.menu ? "Нажми «Включить» и будь начеку" : "Компьютер выключен"}</span></div>`;
        if (task.menu) drawMenuUi(); else drawUi();
      }

      // ---------- обычный режим: список Boot Priority ----------
      function rowHtml(id, i) {
        const d = dev[id];
        const h = HAS[d.has] || HAS.empty;
        return `<div class="bx-row ar-item${d.off ? " off" : ""}" data-dev="${id}" data-key="${id}" tabindex="0" role="button" aria-label="${esc(d.name)}, место ${i + 1}">
          <span class="bx-n">#${i + 1}</span>
          <span class="bx-ico">${ICO[d.kind] || ICO.ssd}</span>
          <span class="bx-nm">${esc(d.name)}<small>${d.kind === "lan" ? "сеть: ищет сервер загрузки" : "внутри: " + h.t}${d.legacy ? ' · <b class="bx-legacy">Legacy</b>' : ""}</small></span>
          <span class="bx-rbtn">
            <button type="button" class="bx-mini" data-nodrag data-up="${id}" aria-label="Выше"${i === 0 || task.lock ? " disabled" : ""}>↑</button>
            <button type="button" class="bx-mini" data-nodrag data-dn="${id}" aria-label="Ниже"${i === order.length - 1 || task.lock ? " disabled" : ""}>↓</button>
            <button type="button" class="bx-mini bx-onoff" data-nodrag data-off="${id}" aria-pressed="${!d.off}">${d.off ? "выкл" : "вкл"}</button>
          </span>
        </div>`;
      }
      function drawUi() {
        ui.innerHTML = `
          <div class="bx-bios-mini">
            <div class="bx-bios-h">BOOT · Приоритет загрузки</div>
            <div class="bx-list" data-list>${order.map(rowHtml).join("")}</div>
            ${task.csm !== undefined ? `<div class="bx-csm"><span>CSM (поддержка Legacy)</span><button type="button" class="bx-switch" role="switch" data-csm aria-checked="${csm}"><i></i></button></div>` : ""}
          </div>
          <div class="game-row"><button class="btn" type="button" data-f10>F10 · Сохранить и перезагрузить</button></div>
          <p class="muted small">Тяни строку пальцем или жми ↑ ↓. Плата пробует устройства сверху вниз.</p>`;
      }
      function redrawList() {
        const list = ui.querySelector("[data-list]");
        if (!list) return;
        flip(list, ".bx-row", () => { list.innerHTML = order.map(rowHtml).join(""); });
      }
      function move(id, to) {
        const from = order.indexOf(id);
        if (from < 0 || to < 0 || to >= order.length || from === to) return;
        order.splice(from, 1);
        order.splice(to, 0, id);
        SND.play("drop");
        redrawList();
      }

      const dnd = A.dnd(root, {
        item: ".bx-row",
        target: ".bx-row",
        noScroll: false,
        onDrop(it, t) {
          if (busy || task.lock) return;
          if (it === t) return;
          move(it.dataset.dev, order.indexOf(t.dataset.dev));
        },
      });

      // ---------- проигрывание загрузки ----------
      function postLines(extra) {
        return [
          `<b class="bx-logo">${esc(task.vendor || "ПАМЯТЬВИЛЬ")}</b>`,
          "CPU: AMD Ryzen 5 7600 ........ OK",
          "Память: 32768 МБ DDR5 ........ OK",
          "Видео: GeForce RTX ........... OK",
          "USB: найдено устройств: " + task.devices.filter((d) => d.kind === "usb").length,
        ].concat(extra || []);
      }
      function typeLines(lines, step, done) {
        scr.innerHTML = `<div class="bx-post"></div>`;
        const box = scr.firstChild;
        let i = 0;
        const next = () => {
          if (!api.alive) return;
          if (i >= lines.length) { done(); return; }
          const p = document.createElement("div");
          p.className = "bx-line";
          p.innerHTML = lines[i++];
          box.appendChild(p);
          SND.play("tick");
          T.anim(step, next);
        };
        next();
      }

      function run() {
        if (busy) return;
        busy = true;
        dnd.clear();
        root.classList.add("bx-running");
        SND.play("click");
        const rows = () => [...root.querySelectorAll(".bx-row")];
        typeLines(postLines(), 260, () => tryDev(0));
        function tryDev(k) {
          if (!api.alive) return;
          rows().forEach((r) => r.classList.remove("try"));
          if (k >= order.length) { result(null); return; }
          const d = dev[order[k]];
          const row = root.querySelector(`.bx-row[data-dev="${d.id}"]`);
          if (row) row.classList.add("try");
          const line = (txt, cls) => {
            const p = document.createElement("div");
            p.className = "bx-line " + (cls || "");
            p.innerHTML = txt;
            const box = scr.querySelector(".bx-post");
            if (box) { box.appendChild(p); box.scrollTop = box.scrollHeight; }
          };
          line(`Boot #${k + 1}: ${esc(d.name)} ...`);
          const h = HAS[d.has] || HAS.empty;
          if (d.off) { T.anim(350, () => { line("  отключено, пропускаю", "dim"); mark(row, "skip"); T.anim(350, () => tryDev(k + 1)); }); return; }
          if (h.net) {
            line("  PXE: ищу сервер загрузки в сети", "dim");
            let dots = 0;
            const iv = T.every(260, () => { const b = scr.querySelector(".bx-post"); if (b && b.lastChild) b.lastChild.textContent += "."; if (++dots > 6) clearInterval(iv); });
            T.anim(2000, () => { clearInterval(iv); line("  PXE-E61: сервер не ответил", "bad"); mark(row, "fail"); SND.play("miss"); T.anim(500, () => tryDev(k + 1)); });
            return;
          }
          if (d.legacy && !csm) { T.anim(500, () => { line("  загрузчик Legacy, а CSM выключен: не вижу", "bad"); mark(row, "fail"); T.anim(500, () => tryDev(k + 1)); }); return; }
          if (!h.boot) { T.anim(500, () => { line("  загрузчика нет", "bad"); mark(row, "fail"); T.anim(450, () => tryDev(k + 1)); }); return; }
          T.anim(600, () => { line("  загрузчик найден!", "ok"); mark(row, "ok"); T.anim(500, () => result(d)); });
        }
      }
      function mark(row, how) {
        if (!row) return;
        row.classList.add(how);
        if (how === "fail" && !reduced()) { row.classList.remove("bx-nudge"); void row.offsetWidth; row.classList.add("bx-nudge"); }
      }

      function result(d) {
        scr.innerHTML = splash(d ? d.has : null);
        root.classList.remove("bx-running");
        const okHas = d && d.has === task.want && (!task.wantDev || d.id === task.wantDev);
        let why = null;
        if (!d) why = task.why && task.why.none ? task.why.none : "Плата перебрала весь список и не нашла, с чего загрузиться. Поставь первым устройство, на котором есть нужный загрузчик.";
        else if (!okHas) {
          why = `Загрузилось «${HAS[d.has].t}» с устройства «${d.name}», а нужно ${HAS[task.want].t}${task.wantDev ? " с «" + dev[task.wantDev].name + "»" : ""}.`;
          if (task.why && task.why[d.has]) why += " " + task.why[d.has];
        } else if (task.needCsm === false && csm) why = "Загрузилось, но CSM всё ещё включён. С ним не включится Secure Boot, а Windows 11 его требует. Выключи CSM и проверь, что всё грузится.";
        else if (task.needCsm === true && !csm) why = "Без CSM Legacy-флешка не загрузится.";
        T.anim(900, () => {
          if (!api.alive) return;
          if (why) {
            api.miss(why, { what: "Задание " + (ti + 1) });
            if (!api.alive) return;
            busy = false;
            tries++;
            root.querySelectorAll(".bx-row").forEach((r) => r.classList.remove("try", "ok", "fail", "skip"));
          } else {
            api.hit(task.pts || (tries ? 60 : 120), task.good || "Загрузилось то, что нужно!");
            if (!reduced()) burst(scr, scr.clientWidth / 2, scr.clientHeight / 2, "#5cf29a", 16);
            T.anim(1500, nextTask);
          }
        });
      }
      function nextTask() {
        if (!api.alive) return;
        ti++;
        if (ti >= tasks.length) { api.done([]); return; }
        load();
      }

      // ---------- меню загрузки: успей нажать клавишу ----------
      function drawMenuUi() {
        const m = task.menu;
        ui.innerHTML = `
          <div class="bx-keys" data-keys>${m.keys.map((k) => `<button type="button" class="bx-key" data-key="${k}" disabled>${k}</button>`).join("")}</div>
          <div class="game-row"><button class="btn" type="button" data-power>⏻ Включить</button></div>
          <p class="muted small">Подсказка появится на экране всего на пару секунд. Порядок загрузки в BIOS менять нельзя: компьютер чужой, флешка нужна один раз.</p>`;
      }
      let menuState = null;
      function power() {
        if (busy) return;
        busy = true;
        const m = task.menu;
        SND.play("click");
        ui.querySelector("[data-power]").disabled = true;
        scr.innerHTML = `<div class="bx-vendor"><b>${esc(m.vendor)}</b><div class="bx-vhint" data-hint>Press <u>${esc(m.setup)}</u> to enter Setup · <u>${esc(m.key)}</u> for Boot Menu</div><div class="bx-vbar"><i data-vbar></i></div></div>`;
        ui.querySelectorAll(".bx-key").forEach((b) => (b.disabled = false));
        const bar = scr.querySelector("[data-vbar]");
        const win = m.window || 3000;
        menuState = { t0: performance.now(), win, open: true };
        const step = (ts) => {
          if (!menuState || !menuState.open || !api.alive) return;
          const p = Math.min(1, (ts - menuState.t0) / win);
          if (bar) bar.style.width = (100 - p * 100) + "%";
          if (p >= 1) { menuState.open = false; late(); return; }
          T.frame(step);
        };
        T.frame(step);
      }
      function late() {
        ui.querySelectorAll(".bx-key").forEach((b) => (b.disabled = true));
        scr.innerHTML = splash("win");
        api.miss(`Не успел. Окно для клавиши короткое, компьютер загрузил Windows как обычно. Здесь меню загрузки по клавише ${task.menu.key}: жми её сразу после включения, можно несколько раз подряд.`, { noLife: true, title: "Мимо:" });
        T.anim(1400, resetMenu);
      }
      function resetMenu() {
        if (!api.alive) return;
        busy = false;
        menuState = null;
        scr.innerHTML = `<div class="bx-idle"><span>Попробуй ещё раз</span></div>`;
        drawMenuUi();
      }
      function pressKey(k) {
        if (!menuState || !menuState.open) return;
        const m = task.menu;
        SND.play("click");
        const b = ui.querySelector(`.bx-key[data-key="${k}"]`);
        if (b && !reduced()) { b.classList.remove("bx-press"); void b.offsetWidth; b.classList.add("bx-press"); }
        if (k === m.key) {
          menuState.open = false;
          ui.querySelectorAll(".bx-key").forEach((x) => (x.disabled = true));
          showBootMenu();
          return;
        }
        if (k === m.setup) {
          menuState.open = false;
          scr.innerHTML = `<div class="bx-uefi-peek"><b>UEFI Setup</b><span>Main · OC · Advanced · Boot · Exit</span></div>`;
          api.miss(`${k} открывает настройки BIOS (Setup), а не меню загрузки. Так тоже можно, но придётся менять порядок, а потом возвращать. Меню загрузки здесь на ${m.key}.`, { noLife: true, title: "Почти:" });
          T.anim(1600, resetMenu);
          return;
        }
        api.miss(`У ${m.vendor} клавиша ${k} ничего не делает при старте. Читай строку внизу экрана: там написано, какая клавиша открывает Boot Menu.`);
        if (!api.alive) return;
      }
      function showBootMenu() {
        const m = task.menu;
        const list = U.shuffle(m.list);
        scr.innerHTML = `<div class="bx-bmenu"><b>Please select boot device:</b>${list.map((e, i) => `<button type="button" class="bx-bm" data-bm="${i}">${esc(e.t)}</button>`).join("")}<small>↑ ↓ выбрать · Enter загрузиться</small></div>`;
        scr._list = list;
        const f = scr.querySelector(".bx-bm");
        if (f) f.focus({ preventScroll: true });
      }
      function pickBoot(i) {
        const e = scr._list && scr._list[i];
        if (!e) return;
        const btn = scr.querySelector(`[data-bm="${i}"]`);
        if (btn) btn.classList.add("sel");
        T.anim(500, () => {
          if (!api.alive) return;
          if (e.ok) {
            scr.innerHTML = splash(task.want);
            api.hit(task.pts || 150, task.good || "Флешка загрузилась один раз, а порядок в BIOS остался прежним.");
            T.anim(1500, nextTask);
          } else {
            api.miss(e.why || "Это не то устройство.");
            if (!api.alive) return;
            T.anim(600, () => { if (api.alive) showBootMenu(); });
          }
        });
      }

      root.addEventListener("click", (e) => {
        const up = e.target.closest("[data-up]"), dn = e.target.closest("[data-dn]"), off = e.target.closest("[data-off]");
        if (!busy && up) { const id = up.dataset.up; move(id, order.indexOf(id) - 1); return; }
        if (!busy && dn) { const id = dn.dataset.dn; move(id, order.indexOf(id) + 1); return; }
        if (!busy && off) { const d = dev[off.dataset.off]; d.off = !d.off; SND.play("click"); redrawList(); return; }
        if (!busy && e.target.closest("[data-csm]")) { csm = !csm; const s = e.target.closest("[data-csm]"); s.setAttribute("aria-checked", String(csm)); SND.play("click"); return; }
        if (e.target.closest("[data-f10]")) { run(); return; }
        if (e.target.closest("[data-power]")) { power(); return; }
        const k = e.target.closest(".bx-key");
        if (k) { pressKey(k.dataset.key); return; }
        const bm = e.target.closest("[data-bm]");
        if (bm) pickBoot(Number(bm.dataset.bm));
      });
      root.addEventListener("keydown", (e) => {
        if (menuState && menuState.open) {
          const map = { Delete: "Del", Escape: "Esc" };
          const k = map[e.key] || e.key;
          if (task.menu.keys.includes(k)) { e.preventDefault(); pressKey(k); }
        }
        const bm = e.target.closest && e.target.closest(".bx-bm");
        if (bm && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
          e.preventDefault();
          const all = [...scr.querySelectorAll(".bx-bm")];
          const i = all.indexOf(bm) + (e.key === "ArrowDown" ? 1 : -1);
          if (all[i]) all[i].focus();
        }
      });

      load();
      return { destroy() { T.clear(); } };
    },
  };

  // ================= kind: guard =================
  A.kinds.guard = {
    mount(root, L, api) {
      const T = Timers();
      const tpm = L.mode === "tpm";
      const speed = (L.speed || 7) * 1000;
      const gap = (L.gap || 3) * 1000;
      const queue = [];
      const pool = L.pool;
      let bag = U.shuffle(pool);
      for (let i = 0; i < (L.count || 8); i++) { if (!bag.length) bag = U.shuffle(pool); queue.push(bag.pop()); }
      const live = [];
      let spawned = 0, resolved = 0, right = 0, lastSpawn = -1e9, t0 = 0, stopped = false;

      const yes = tpm ? "🔑 Выдать ключ" : "✓ Пропустить";
      const no = tpm ? "🔒 Не выдавать" : "✕ Остановить";
      root.innerHTML = `
        <div class="bx-guard${tpm ? " tpm" : ""}">
          <div class="bx-lane" data-lane>
            <div class="bx-belt"></div>
            <div class="bx-gate" data-gate>${tpm
              ? `<svg viewBox="0 0 40 48"><rect x="4" y="8" width="32" height="36" rx="3" fill="#3a4a42"/><rect x="8" y="12" width="24" height="28" rx="2" fill="#1d2a23"/><circle cx="20" cy="26" r="7" fill="none" stroke="#e0a458" stroke-width="3"/><rect x="19" y="19" width="2" height="6" fill="#e0a458"/><text x="20" y="7" font-size="6" text-anchor="middle" fill="#9bb0a4">TPM</text></svg>`
              : `<svg viewBox="0 0 40 48"><path d="M20 2 L36 8 V22 C36 34 28 42 20 46 C12 42 4 34 4 22 V8 Z" fill="#1d2a23" stroke="#5cf29a" stroke-width="2.5"/><path d="M13 23 L18 28 L28 16" fill="none" stroke="#5cf29a" stroke-width="3"/></svg>`}</div>
            <div class="bx-pc" data-pc><i></i></div>
          </div>
          <div class="bx-gbtns">
            <button type="button" class="btn bx-no" data-g="no">${no}</button>
            <button type="button" class="btn bx-yes" data-g="yes">${yes}</button>
          </div>
          <p class="muted small bx-gstat" data-gstat></p>
        </div>`;
      const lane = root.querySelector("[data-lane]");
      const gate = root.querySelector("[data-gate]");
      const pc = root.querySelector("[data-pc]");
      const stat = root.querySelector("[data-gstat]");
      function upd() { stat.textContent = `Обработано ${resolved} из ${queue.length} · верно ${right} · клавиши ← и → тоже работают`; }
      upd();

      function spawn(now) {
        const it = queue[spawned++];
        const el = document.createElement("div");
        el.className = "bx-card " + (it.badge || "");
        el.innerHTML = `<b>${esc(it.t)}</b><span>${it.s}</span>`;
        lane.appendChild(el);
        live.push({ it, el, born: now, p: 0, done: false });
      }
      function front() { return live.filter((x) => !x.done).sort((a, b) => b.p - a.p)[0] || null; }
      function geom() {
        const w = lane.clientWidth, g = gate.offsetLeft;
        return { w, g };
      }
      function loop(now) {
        if (stopped || !api.alive) return;
        if (!t0) t0 = now;
        if (spawned < queue.length && now - lastSpawn >= gap && (live.filter((x) => !x.done).length < (L.max || 3))) { lastSpawn = now; spawn(now); }
        const { g } = geom();
        const f = front();
        live.forEach((x) => {
          if (x.done) return;
          x.p = (now - x.born) / speed;
          const cw = x.el.offsetWidth;
          const end = Math.max(0, g - cw - 4);
          x.el.style.transform = `translateX(${Math.min(1, x.p) * end}px)`;
          x.el.classList.toggle("front", x === f);
          x.el.classList.toggle("near", x.p > 0.72);
          if (x.p >= 1) reachGate(x);
        });
        if (resolved >= queue.length) { finish(); return; }
        T.frame(loop);
      }
      function settle(x) {
        x.done = true;
        resolved++;
        upd();
        T.after(800, () => x.el.remove());
      }
      function letIn(x, good) {
        x.el.classList.add("pass");
        const { w } = geom();
        x.el.style.transition = "transform .55s ease-in, opacity .55s";
        x.el.style.transform = `translateX(${w}px) scale(.6)`;
        x.el.style.opacity = "0";
        pc.className = "bx-pc " + (good ? "on" : "hacked");
        T.after(900, () => { pc.className = "bx-pc"; });
      }
      function zap(x) {
        x.el.classList.add("zap");
        const r = x.el.getBoundingClientRect(), lr = lane.getBoundingClientRect();
        burst(lane, r.left - lr.left + r.width / 2, r.top - lr.top + r.height / 2, tpm ? "#e0a458" : "#ff6b6b", 14);
        gate.classList.remove("bx-pulse"); void gate.offsetWidth; gate.classList.add("bx-pulse");
      }
      function bounce(x) {
        x.el.classList.add("bounced");
        x.el.style.transition = "transform .4s, opacity .4s";
        x.el.style.opacity = "0";
      }
      function decide(say) {
        if (stopped) return;
        const x = front();
        if (!x) return;
        const it = x.it;
        settle(x);
        const pts = 50 + Math.round(Math.max(0, 1 - x.p) * 50);
        if (say === "yes" && it.ok) { letIn(x, true); right++; api.hit(pts, it.why); }
        else if (say === "no" && !it.ok) { zap(x); right++; api.hit(pts, it.why); }
        else if (say === "yes" && !it.ok) { letIn(x, false); api.miss(it.why, { what: it.t }); }
        else { bounce(x); api.miss(it.why, { what: it.t }); }
        upd();
      }
      function reachGate(x) {
        settle(x);
        if (x.it.ok) { letIn(x, true); api.info(tpm ? "Ключ выдан автоматически, но очков нет: решай быстрее." : "Ворота открыты по умолчанию: загрузчик прошёл, но очков нет. Решай быстрее.", "Медленно."); }
        else { letIn(x, false); api.miss((tpm ? "Никто не проверил запрос. " : "Никто не остановил. ") + x.it.why, { what: x.it.t, title: "Проскочил:" }); }
      }
      function finish() {
        if (stopped) return;
        stopped = true;
        const acc = queue.length ? right / queue.length : 0;
        T.after(700, () => api.done([{ label: `Точность ${Math.round(acc * 100)} %`, pts: Math.round(acc * 200 * (api.index + 1)) }]));
      }

      root.addEventListener("click", (e) => { const b = e.target.closest("[data-g]"); if (b) decide(b.dataset.g); });
      const key = (e) => {
        if (!root.isConnected) return;
        if (e.key === "ArrowRight") { e.preventDefault(); decide("yes"); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); decide("no"); }
      };
      document.addEventListener("keydown", key);
      T.frame(loop);
      return { destroy() { stopped = true; T.clear(); document.removeEventListener("keydown", key); } };
    },
  };

  // ================= kind: uefi =================
  A.kinds.uefi = {
    mount(root, L, api, cfg) {
      const T = Timers();
      const DEF = {};
      cfg.settings.forEach((d) => (DEF[d.id] = d));
      const s = Object.assign({}, cfg.defaults, L.start || {});
      const start = Object.assign({}, s);
      const tabs = (L.tabs || cfg.tabs.map((t) => t.id)).map((id) => cfg.tabs.find((t) => t.id === id)).filter(Boolean);
      let tab = L.tab || tabs[0].id, busy = false, focus = null;
      const st = { tested: null, last: null };
      const ocKey = () => JSON.stringify([s.freq, s.volt, s.fans]);

      root.innerHTML = `
        <div class="bx-uefi" data-uefi>
          <div class="bx-u-head">
            <b>UEFI BIOS Utility</b><span class="bx-u-mb">${esc(cfg.board || "Памятьвиль B650")}</span>
            <span class="bx-u-temp" data-temp>CPU —°C</span>
          </div>
          <div class="bx-u-tabs" role="tablist">${tabs.map((t) => `<button type="button" role="tab" class="bx-u-tab" data-tab="${t.id}">${t.label}</button>`).join("")}</div>
          <div class="bx-u-body">
            <div class="bx-u-list" data-list></div>
            <div class="bx-u-help" data-help></div>
          </div>
          <div class="bx-u-foot">
            <button type="button" class="bx-u-k" data-undo>F5 · Отменить всё</button>
            ${L.stress ? `<button type="button" class="bx-u-k stress" data-stress>Стресс-тест</button>` : ""}
            <button type="button" class="bx-u-k save" data-save>F10 · Сохранить и выйти</button>
          </div>
          <div class="bx-u-over" data-over hidden></div>
        </div>
        <div class="bx-u-tasks" data-tasks></div>`;
      const list = root.querySelector("[data-list]");
      const help = root.querySelector("[data-help]");
      const over = root.querySelector("[data-over]");
      const tempEl = root.querySelector("[data-temp]");
      const tasksEl = root.querySelector("[data-tasks]");
      const doneSet = new Set();

      function fmt(d, v) {
        if (d.type === "toggle") return v ? "Вкл" : "Выкл";
        if (d.type === "range") return (d.fmt ? d.fmt(v) : v) + (d.unit || "");
        return String(v);
      }
      function control(d) {
        const v = s[d.id];
        const lock = d.lock && d.lock(s);
        const dis = lock ? " disabled" : "";
        if (d.type === "info") return `<span class="bx-u-info">${d.val(s)}</span>`;
        if (d.type === "toggle") return `<button type="button" class="bx-switch" role="switch" aria-checked="${!!v}" data-set="${d.id}"${dis}><i></i></button><span class="bx-u-v">${fmt(d, v)}</span>`;
        if (d.type === "select") return `<span class="bx-seg">${d.options.map((o) => `<button type="button" class="bx-opt" data-set="${d.id}" data-v="${esc(o)}" aria-pressed="${o === v}"${dis}>${esc(o)}</button>`).join("")}</span>`;
        if (d.type === "range") return `<span class="bx-rng"><button type="button" class="bx-mini" data-step="${d.id}" data-d="-1"${dis}>−</button><input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}" data-rng="${d.id}"${dis} aria-label="${esc(d.label)}"><button type="button" class="bx-mini" data-step="${d.id}" data-d="1"${dis}>+</button><b class="bx-u-v" data-rv="${d.id}">${fmt(d, v)}</b></span>`;
        return "";
      }
      function draw() {
        root.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
        const defs = cfg.settings.filter((d) => d.tab === tab && (!L.only || L.only.includes(d.id) || d.type === "info"));
        list.innerHTML = defs.map((d) => {
          const lock = d.lock && d.lock(s);
          const changed = d.type !== "info" && s[d.id] !== start[d.id];
          return `<div class="bx-u-row${lock ? " locked" : ""}${changed ? " changed" : ""}" data-row="${d.id}" tabindex="-1"><span class="bx-u-l">${d.label}${lock ? `<small>${lock}</small>` : ""}</span><span class="bx-u-c">${control(d)}</span></div>`;
        }).join("");
        if (focus && DEF[focus] && DEF[focus].tab === tab) showHelp(focus); else help.innerHTML = `<b>${tabs.find((t) => t.id === tab).label}</b><p>${tabs.find((t) => t.id === tab).help || "Нажми на строку, чтобы прочитать подсказку."}</p>`;
        checks();
      }
      function showHelp(id) {
        const d = DEF[id];
        if (!d) return;
        focus = id;
        help.innerHTML = `<b>${d.label}</b><p>${d.help || ""}</p>`;
        root.querySelectorAll(".bx-u-row").forEach((r) => r.classList.toggle("focus", r.dataset.row === id));
      }
      function checks() {
        tasksEl.innerHTML = `<b>Задания</b><ul>${L.tasks.map((t, i) => {
          const ok = !!t.ok(s, st);
          if (ok && !doneSet.has(i)) { doneSet.add(i); if (!reduced()) T.after(10, () => { const li = tasksEl.querySelector(`[data-t="${i}"]`); if (li) li.classList.add("bx-pop"); }); SND.play("pick"); }
          if (!ok) doneSet.delete(i);
          return `<li data-t="${i}" class="${ok ? "ok" : ""}">${ok ? "✓" : "○"} ${t.t}</li>`;
        }).join("")}</ul>`;
      }
      function set(id, v) {
        const d = DEF[id];
        if (!d || (d.lock && d.lock(s))) return;
        s[id] = v;
        if (cfg.onSet) cfg.onSet(s, id);
        SND.play("click");
        draw();
        showHelp(id);
      }
      function tempLoop() {
        if (!api.alive) return;
        const m = cfg.model ? cfg.model(s) : null;
        const base = m ? m.idle : 38;
        tempEl.textContent = `CPU ${Math.round(base + Math.random() * 2)}°C`;
        tempEl.classList.toggle("hot", base > 60);
      }
      T.every(1000, tempLoop);
      tempLoop();

      // ---------- стресс-тест ----------
      function stress() {
        if (busy || !cfg.model) return;
        busy = true;
        const m = cfg.model(s);
        over.hidden = false;
        over.innerHTML = `<div class="bx-st"><b>Стресс-тест · ${esc(DEF.freq ? fmt(DEF.freq, s.freq) : "")}</b>
          <svg viewBox="0 0 200 80" class="bx-graph"><line x1="0" y1="${80 - 90 * 0.8}" x2="200" y2="${80 - 90 * 0.8}" class="lim"/><polyline data-pl points=""/></svg>
          <div class="bx-st-row"><span>Температура <b data-st-t>—</b></span><span>Очки теста <b data-st-s>0</b></span></div></div>`;
        const pl = over.querySelector("[data-pl]"), tt = over.querySelector("[data-st-t]"), ss = over.querySelector("[data-st-s]");
        const dur = reduced() ? 300 : 3200;
        const crashAt = m.stable ? 2 : 0.55;
        const t0 = performance.now();
        const pts = [];
        const score = Math.round(1000 * (1 + m.perf));
        SND.play("level");
        const step = (now) => {
          if (!api.alive) return;
          const p = Math.min(1, (now - t0) / dur);
          const temp = m.idle + (m.temp - m.idle) * (1 - Math.exp(-p * 4)) + (Math.random() - 0.5) * 1.5;
          pts.push(`${(p * 200).toFixed(1)},${(80 - Math.min(100, temp) * 0.8).toFixed(1)}`);
          pl.setAttribute("points", pts.join(" "));
          tt.textContent = Math.round(temp) + "°C";
          tt.className = temp >= 90 ? "bad" : temp >= 80 ? "warn" : "ok";
          ss.textContent = Math.round(score * p);
          if (p >= crashAt) { crash(m); return; }
          if (p >= 1) { passTest(m, score); return; }
          T.frame(step);
        };
        T.frame(step);
      }
      function crash(m) {
        over.innerHTML = `<div class="bx-bsod"><b>:(</b><p>На компьютере возникла проблема.</p><p class="mono">WHEA_UNCORRECTABLE_ERROR</p></div>`;
        SND.play("miss");
        st.tested = ocKey();
        st.last = { stable: false, temp: m.temp, perf: m.perf };
        api.info(`Синий экран: процессору на ${fmt(DEF.freq, s.freq)} не хватает напряжения (нужно хотя бы ${m.need.toFixed(2)} В). Подними напряжение чуть-чуть или снизь частоту. Тест для того и нужен, чтобы падать здесь, а не в игре.`, "Нестабильно.");
        T.anim(2200, () => { over.hidden = true; busy = false; checks(); });
      }
      function passTest(m, score) {
        st.tested = ocKey();
        st.last = { stable: true, temp: m.temp, perf: m.perf, score };
        const hot = m.temp >= 90;
        over.querySelector(".bx-st").insertAdjacentHTML("beforeend", `<p class="${hot ? "bad" : "ok"}">${hot ? "Стабильно, но слишком горячо: выше 90 °C процессор будет сбрасывать частоту" : "Стабильно!"} · скорость ${m.perf >= 0 ? "+" : ""}${Math.round(m.perf * 100)} %</p><button type="button" class="btn" data-st-close>Назад в BIOS</button>`);
        SND.play(hot ? "miss" : "hit", 3);
        api.info(hot ? "Перегрев: убавь напряжение или выбери вентиляторы помощнее." : `Тест пройден: ${Math.round(m.temp)} °C, ${score} очков.`, "Стресс-тест:");
        checks();
      }

      // ---------- F10: сохранить и перезагрузить ----------
      function save() {
        if (busy) return;
        const diff = cfg.settings.filter((d) => d.type !== "info" && s[d.id] !== start[d.id]);
        const m = api.modal(`<h3>Сохранить и выйти?</h3>
          ${diff.length ? `<p class="muted">Изменения:</p><ul class="bx-diff">${diff.map((d) => `<li>${d.label}: <s>${esc(fmt(d, start[d.id]))}</s> → <b>${esc(fmt(d, s[d.id]))}</b></li>`).join("")}</ul>` : `<p class="muted">Ты ничего не изменил.</p>`}
          <div class="game-row"><button type="button" class="btn" data-yes>Да</button><button type="button" class="btn ghost" data-close>Нет</button></div>`);
        m.el.querySelector("[data-yes]").addEventListener("click", () => { m.close(); reboot(); });
      }
      function reboot() {
        busy = true;
        over.hidden = false;
        over.innerHTML = `<div class="bx-rb"><div class="bx-fan"></div><div class="bx-post" data-rb></div></div>`;
        const box = over.querySelector("[data-rb]");
        const bad = (cfg.danger || []).map((f) => f(s)).filter(Boolean).concat((L.forbid || []).map((f) => f(s)).filter(Boolean));
        const lines = ["Сохраняю настройки...", "Перезагрузка", "POST: процессор OK", "POST: память " + (DEF.mem ? DEF.mem.val(s) : "OK")];
        let i = 0;
        const next = () => {
          if (!api.alive) return;
          if (i < lines.length) { box.insertAdjacentHTML("beforeend", `<div class="bx-line">${lines[i++]}</div>`); SND.play("tick"); T.anim(380, next); return; }
          verdict(bad);
        };
        next();
      }
      function verdict(bad) {
        const missing = L.tasks.filter((t) => !t.ok(s, st));
        if (bad.length) {
          over.innerHTML = `<div class="bx-smoke"><div class="bx-chip"></div><p>${bad[0]}</p></div>`;
          api.miss(bad[0], { what: "F10" });
          if (!api.alive) return;
          T.anim(2400, () => { over.hidden = true; busy = false; });
          return;
        }
        if (missing.length) {
          over.hidden = true;
          busy = false;
          api.miss(`Сохранено, но задание не выполнено: «${missing[0].t}».${missing[0].why ? " " + missing[0].why : ""}`, { what: "F10" });
          return;
        }
        const finishOk = () => {
          over.innerHTML = splash(L.os || "win");
          api.hit(L.reward || 200, L.good || "Все задания выполнены, компьютер стартовал.");
          T.anim(1400, () => api.done([{ label: "Заданий выполнено", pts: L.tasks.length * 40 }]));
        };
        if (L.after === "wol") wol(finishOk); else finishOk();
      }
      // Волшебный пакет: телефон → роутер → ПК просыпается
      function wol(done) {
        over.innerHTML = `<div class="bx-wol"><span class="bx-phone">📱</span><span class="bx-wire"><i class="bx-pkt"></i></span><span class="bx-router">📶</span><span class="bx-wire"><i class="bx-pkt d2"></i></span><span class="bx-sleep" data-pcw>🖥️<small>спит</small></span><p>Отправляю Magic Packet: 6 байт FF и MAC-адрес 16 раз</p></div>`;
        T.anim(2000, () => {
          const pcw = over.querySelector("[data-pcw]");
          if (pcw) { pcw.classList.add("awake"); pcw.querySelector("small").textContent = "проснулся!"; }
          SND.play("level");
          T.anim(1200, done);
        });
      }

      root.addEventListener("click", (e) => {
        if (busy) { if (e.target.closest("[data-st-close]")) { over.hidden = true; busy = false; } return; }
        const tb = e.target.closest("[data-tab]");
        if (tb) { tab = tb.dataset.tab; focus = null; SND.play("click"); draw(); return; }
        const st1 = e.target.closest("[data-step]");
        if (st1) { const d = DEF[st1.dataset.step]; const v = Math.round((Number(s[d.id]) + Number(st1.dataset.d) * d.step) * 1000) / 1000; if (v >= d.min && v <= d.max) set(d.id, v); return; }
        const sw = e.target.closest("[data-set]");
        if (sw) { const d = DEF[sw.dataset.set]; set(d.id, d.type === "toggle" ? !s[d.id] : sw.dataset.v); return; }
        if (e.target.closest("[data-undo]")) { Object.assign(s, start); SND.play("drop"); draw(); return; }
        if (e.target.closest("[data-stress]")) { stress(); return; }
        if (e.target.closest("[data-save]")) { save(); return; }
        const row = e.target.closest("[data-row]");
        if (row) showHelp(row.dataset.row);
      });
      root.addEventListener("input", (e) => {
        const r = e.target.closest("[data-rng]");
        if (!r) return;
        const d = DEF[r.dataset.rng];
        s[d.id] = Number(r.value);
        const out = root.querySelector(`[data-rv="${d.id}"]`);
        if (out) out.textContent = fmt(d, s[d.id]);
        showHelp(d.id);
        checks();
      });
      root.addEventListener("change", (e) => { if (e.target.closest("[data-rng]")) { const id = e.target.dataset.rng; draw(); showHelp(id); } });
      root.addEventListener("keydown", (e) => {
        if (e.key === "F10") { e.preventDefault(); save(); }
      });

      draw();
      return { destroy() { T.clear(); } };
    },
  };

  // ================= kind: flash =================
  const BOARD = (b) => `<div class="bx-sticker"><span class="bx-silk">${esc(b.vendor || "")}</span><b>${esc(b.model)}</b><span class="bx-silk">REV ${esc(b.rev || "1.0")}</span>${b.current ? `<small>сейчас BIOS: ${esc(b.current)}</small>` : ""}</div>`;

  A.kinds.flash = {
    mount(root, L, api) {
      const T = Timers();
      const phase = L.phase;
      if (phase === "pick") pick();
      else if (phase === "prep") prep();
      else if (phase === "flash") boss();
      else rescue();

      // ---------- выбери правильный файл ----------
      function pick() {
        let r = 0;
        const show = () => {
          const R = L.rounds[r];
          root.innerHTML = `
            <div class="bx-pick">
              <div class="bx-pick-b"><span class="bx-step">Плата ${r + 1} из ${L.rounds.length}</span>${R.say ? `<p>${R.say}</p>` : ""}<div class="bx-board">${BOARD(R.board)}<div class="bx-loupe"></div></div></div>
              <div class="bx-dl"><b>Сайт производителя · Поддержка · BIOS</b>${U.shuffle(R.files).map((f, i) => `<button type="button" class="bx-file" data-f="${R.files.indexOf(f)}"><span class="bx-fn">${esc(f.name)}</span><span class="bx-fm">${esc(f.model)} · ${esc(f.ver)}${f.beta ? ' <i class="bx-beta">Beta</i>' : ""} · ${esc(f.date)}</span>${f.note ? `<small>${f.note}</small>` : ""}</button>`).join("")}</div>
            </div>`;
        };
        root.addEventListener("click", (e) => {
          const b = e.target.closest("[data-f]");
          if (!b || b.disabled) return;
          const R = L.rounds[r];
          const f = R.files[Number(b.dataset.f)];
          if (f.ok) {
            b.classList.add("ok");
            root.querySelectorAll("[data-f]").forEach((x) => (x.disabled = true));
            api.hit(120, f.why);
            T.anim(1300, () => { if (!api.alive) return; r++; if (r >= L.rounds.length) api.done([]); else show(); });
          } else {
            b.classList.add("bad");
            b.disabled = true;
            api.miss(f.why, { what: R.board.model });
          }
        });
        show();
      }

      // ---------- подготовка ----------
      function prep() {
        const items = U.shuffle(L.items);
        const on = new Set();
        root.innerHTML = `
          <div class="bx-prep">
            <p>Отметь всё, что нужно сделать <b>до</b> обновления. Лишнее не отмечай.</p>
            <div class="bx-prep-g">${items.map((it, i) => `<button type="button" class="bx-pc-card" data-p="${i}" aria-pressed="false"><span class="bx-tick"></span>${it.t}</button>`).join("")}</div>
            <div class="game-row"><button class="btn" type="button" data-go>Готово, начинаю обновление</button></div>
          </div>`;
        root.addEventListener("click", (e) => {
          const c = e.target.closest("[data-p]");
          if (c) {
            const i = Number(c.dataset.p);
            if (on.has(i)) on.delete(i); else on.add(i);
            c.setAttribute("aria-pressed", String(on.has(i)));
            SND.play("click");
            return;
          }
          if (!e.target.closest("[data-go]")) return;
          const extra = [...on].filter((i) => !items[i].ok);
          const missed = items.map((it, i) => i).filter((i) => items[i].ok && !on.has(i));
          root.querySelectorAll("[data-p]").forEach((c2) => c2.classList.remove("bad", "miss"));
          if (!extra.length && !missed.length) {
            root.querySelectorAll("[data-p]").forEach((c2) => { if (on.has(Number(c2.dataset.p))) c2.classList.add("good"); });
            api.hit(60 * items.filter((x) => x.ok).length, "Подготовка без ошибок. Теперь даже гроза не страшна.");
            T.anim(1200, () => api.done([]));
            return;
          }
          extra.forEach((i) => root.querySelector(`[data-p="${i}"]`).classList.add("bad"));
          missed.forEach((i) => root.querySelector(`[data-p="${i}"]`).classList.add("miss"));
          const first = extra.length ? items[extra[0]] : items[missed[0]];
          api.miss(`${extra.length ? "Лишнее: " : "Забыл: "}${first.t}. ${first.why} (ошибок: ${extra.length + missed.length}, красные лишние, жёлтые забыты)`, { what: "Подготовка" });
        });
      }

      // ---------- босс: прошивка, а Глюк мешает ----------
      function boss() {
        const events = U.shuffle(L.pool).slice(0, L.events || 6);
        const dur = (L.duration || 45) * 1000;
        const marks = events.map((ev, i) => 0.08 + (0.84 * (i + 0.3 + Math.random() * 0.4)) / events.length);
        let p = 0, last = 0, ei = 0, cur = null, hp = events.length, power = true, ended = false;
        root.innerHTML = `
          <div class="bx-boss">
            <div class="bx-room" data-room>
              <div class="bx-win"><i class="bx-rain"></i></div>
              <img class="gif bx-glitch" data-gl src="${GIF("glitch-idle")}" alt="" width="72" height="72">
              <div class="bx-hp"><span>Глюк</span><i><em data-hp style="width:100%"></em></i></div>
            </div>
            <div class="bx-flasher">
              <div class="bx-fl-h"><b>${esc(L.tool || "EZ Flash")}</b><span data-stage>Стирание</span></div>
              <div class="bx-blocks" data-blocks>${"<i></i>".repeat(64)}</div>
              <div class="bx-fl-row"><span class="mono" data-addr>0x00000000</span><b data-pct>0 %</b></div>
              <div class="bx-fl-bar"><i data-bar></i></div>
              <p class="bx-fl-warn">⚠ Не выключайте компьютер и не отключайте питание</p>
            </div>
            <div class="bx-event" data-ev hidden></div>
          </div>`;
        const blocks = [...root.querySelectorAll("[data-blocks] i")];
        const bar = root.querySelector("[data-bar]"), pct = root.querySelector("[data-pct]"), addr = root.querySelector("[data-addr]"), stage = root.querySelector("[data-stage]");
        const evBox = root.querySelector("[data-ev]"), room = root.querySelector("[data-room]"), gl = root.querySelector("[data-gl]"), hpEl = root.querySelector("[data-hp]");

        function loop(now) {
          if (ended || !api.alive) return;
          if (!last) last = now;
          const dt = now - last;
          last = now;
          if (power) p = Math.min(1, p + dt / dur);
          const n = Math.floor(p * blocks.length);
          blocks.forEach((b, i) => (b.className = i < n ? (p < 0.25 ? "er" : p < 0.85 ? "wr" : "ok") : ""));
          bar.style.width = p * 100 + "%";
          pct.textContent = Math.floor(p * 100) + " %";
          addr.textContent = "0x" + Math.floor(p * 0x01ffffff).toString(16).toUpperCase().padStart(8, "0");
          stage.textContent = p < 0.25 ? "Стирание" : p < 0.85 ? "Запись" : "Проверка";
          if (!cur && ei < events.length && p >= marks[ei]) openEvent(events[ei++]);
          if (p >= 1 && !cur) { win(); return; }
          T.frame(loop);
        }
        function openEvent(ev) {
          const time = (ev.time || L.react || 6) * 1000;
          cur = { ev, t0: performance.now(), time };
          if (ev.fx) room.classList.add(ev.fx);
          gl.src = GIF("glitch-laugh");
          evBox.hidden = false;
          evBox.innerHTML = `<div class="bx-ev-card"><div class="bx-ring" data-ring></div><div><b>${ev.t}</b>${ev.s ? `<p>${ev.s}</p>` : ""}</div>
            <div class="bx-ev-btns">${U.shuffle(ev.options).map((o) => `<button type="button" class="btn ghost" data-o="${ev.options.indexOf(o)}">${o.t}</button>`).join("")}</div></div>`;
          SND.play("tick");
          const ring = evBox.querySelector("[data-ring]");
          const tick = (now) => {
            if (!cur || cur.ev !== ev || !api.alive) return;
            const left = 1 - (now - cur.t0) / time;
            ring.style.setProperty("--p", Math.max(0, left));
            if (left <= 0) { answer(null); return; }
            T.frame(tick);
          };
          T.frame(tick);
        }
        function closeEvent() {
          if (cur && cur.ev.fx) room.classList.remove(cur.ev.fx);
          cur = null;
          evBox.hidden = true;
          evBox.innerHTML = "";
        }
        function answer(o) {
          if (!cur) return;
          const ev = cur.ev;
          if (o && o.ok) {
            closeEvent();
            hp--;
            hpEl.style.width = (100 * hp) / events.length + "%";
            gl.src = GIF("glitch-hurt");
            if (!reduced()) { gl.classList.remove("bx-hit"); void gl.offsetWidth; gl.classList.add("bx-hit"); const r = gl.getBoundingClientRect(), rr = room.getBoundingClientRect(); burst(room, r.left - rr.left + r.width / 2, r.top - rr.top + r.height / 2, "#c58bff", 14); }
            T.after(900, () => (gl.src = GIF("glitch-idle")));
            api.hit(100, o.why || ev.why);
          } else {
            closeEvent();
            gl.src = GIF("glitch-laugh");
            if (ev.power !== false) {
              power = false;
              room.classList.add("bx-dark");
              root.querySelector(".bx-flasher").classList.add("bx-flicker");
              T.anim(1400, () => { power = true; room.classList.remove("bx-dark"); const f = root.querySelector(".bx-flasher"); if (f) f.classList.remove("bx-flicker"); });
            }
            api.miss((o ? o.why + " " : "Не успел решить. ") + (ev.why || ""), { what: ev.t.replace(/<[^>]+>/g, "") });
          }
        }
        function win() {
          ended = true;
          stage.textContent = "Готово";
          root.querySelector(".bx-fl-warn").textContent = "✓ BIOS обновлён. Перезагрузка...";
          gl.src = GIF("glitch-hurt");
          gl.classList.add("bx-gone");
          SND.play("win");
          T.anim(1500, () => api.done([{ label: "Атаки Глюка отбиты", pts: (events.length - hp) * 40 }]));
        }
        evBox.addEventListener("click", (e) => { const b = e.target.closest("[data-o]"); if (b && cur) answer(cur.ev.options[Number(b.dataset.o)]); });
        T.frame(loop);
      }

      // ---------- плата не стартует: спасаем ----------
      function rescue() {
        let r = 0;
        const next = () => { if (!api.alive) return; r++; if (r >= L.rounds.length) api.done([]); else show(); };
        function show() {
          const R = L.rounds[r];
          const head = `<span class="bx-step">Случай ${r + 1} из ${L.rounds.length}</span><p>${R.say}</p>`;
          if (R.type === "flashback") flashback(R, head);
          else if (R.type === "dual") dual(R, head);
          else choice(R, head);
        }
        function choice(R, head) {
          root.innerHTML = `<div class="bx-resc">${head}${R.board ? `<div class="bx-board">${BOARD(R.board)}</div>` : ""}<div class="bx-opts">${U.shuffle(R.options).map((o) => `<button type="button" class="btn ghost" data-o="${R.options.indexOf(o)}">${o.t}</button>`).join("")}</div></div>`;
          root.onclick = (e) => {
            const b = e.target.closest("[data-o]");
            if (!b || b.disabled) return;
            const o = R.options[Number(b.dataset.o)];
            if (o.ok) { root.onclick = null; b.classList.add("ok"); api.hit(120, o.why); T.anim(1300, next); }
            else { b.disabled = true; api.miss(o.why, { what: "Спасение платы" }); }
          };
        }
        // Gigabyte DualBIOS: переключатель на плате, потом решение
        function dual(R, head) {
          let sw = 1, booted = false;
          root.innerHTML = `<div class="bx-resc">${head}
            <div class="bx-pcb"><div class="bx-chipset"><span>Main BIOS</span><i data-c1 class="dead"></i></div><div class="bx-chipset"><span>Backup BIOS</span><i data-c2></i></div>
              <button type="button" class="bx-dsw" data-sw aria-label="Переключатель BIOS_SW"><span>BIOS_SW</span><i data-knob></i><em>1 · 2</em></button>
              <button type="button" class="bx-pwr" data-pw aria-label="Кнопка питания">⏻</button></div>
            <div class="bx-monitor small"><div class="bx-screen" data-scr><div class="bx-idle"><span>Чёрный экран</span></div></div></div>
            <div class="bx-opts" data-after hidden></div></div>`;
          const scr = root.querySelector("[data-scr]");
          root.onclick = (e) => {
            if (e.target.closest("[data-sw]") && !booted) {
              sw = sw === 1 ? 2 : 1;
              root.querySelector("[data-sw]").classList.toggle("on2", sw === 2);
              SND.play("click");
              return;
            }
            if (e.target.closest("[data-pw]") && !booted) {
              SND.play("click");
              if (sw === 1) {
                scr.innerHTML = `<div class="bx-idle bad"><span>Вентиляторы крутятся, экран чёрный</span></div>`;
                api.miss("Плата пробует основную микросхему, а она испорчена неудачной прошивкой. Переключи BIOS_SW на резервную (2) и включи снова.", { what: "DualBIOS" });
                return;
              }
              booted = true;
              scr.innerHTML = `<div class="bx-post"><div class="bx-line">Загрузка с Backup BIOS...</div><div class="bx-line ok">POST пройден!</div></div>`;
              api.hit(100, "Резервная микросхема цела, плата ожила.");
              const after = root.querySelector("[data-after]");
              after.hidden = false;
              after.innerHTML = `<p><b>Что теперь?</b></p>` + U.shuffle(R.options).map((o) => `<button type="button" class="btn ghost" data-o="${R.options.indexOf(o)}">${o.t}</button>`).join("");
              return;
            }
            const b = e.target.closest("[data-o]");
            if (b && !b.disabled) {
              const o = R.options[Number(b.dataset.o)];
              if (o.ok) { root.onclick = null; b.classList.add("ok"); api.hit(120, o.why); T.anim(1300, next); }
              else { b.disabled = true; api.miss(o.why, { what: "DualBIOS" }); }
            }
          };
        }
        // BIOS Flashback: имя файла → правильный порт → держать кнопку → мигает
        function flashback(R, head) {
          let step = 0;
          const draw = () => {
            root.innerHTML = `<div class="bx-resc">${head}
              <ol class="bx-fsteps"><li class="${step > 0 ? "ok" : step === 0 ? "cur" : ""}">Файл на флешке</li><li class="${step > 1 ? "ok" : step === 1 ? "cur" : ""}">Нужный порт</li><li class="${step > 2 ? "ok" : step === 2 ? "cur" : ""}">Держать кнопку</li></ol>
              <div data-body></div></div>`;
            const body = root.querySelector("[data-body]");
            if (step === 0) {
              body.innerHTML = `<p>Как должен называться файл в корне флешки FAT32? Подсказка в инструкции: «${R.hint}».</p><div class="bx-opts">${U.shuffle(R.names).map((n) => `<button type="button" class="btn ghost mono" data-n="${R.names.indexOf(n)}">${esc(n.t)}</button>`).join("")}</div>`;
            } else if (step === 1) {
              body.innerHTML = `<p>Куда вставить флешку? Ищи порт с рамкой и подписью.</p><div class="bx-io">${R.ports.map((pt, i) => `<button type="button" class="bx-port ${pt.kind}${pt.ok ? " fb" : ""}" data-pt="${i}" aria-label="${esc(pt.label)}"><i></i><small>${esc(pt.label)}</small></button>`).join("")}<span class="bx-fbbtn" aria-hidden="true">BIOS</span></div>`;
            } else if (step === 2) {
              body.innerHTML = `<p>Компьютер выключен, но блок питания в розетке. Зажми кнопку Flashback и держи ${R.hold || 3} секунды, пока индикатор не замигает.</p>
                <div class="bx-hold"><button type="button" class="bx-holdbtn" data-hold><span>BIOS<br>FLASHBACK</span><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" class="bg"/><circle cx="20" cy="20" r="17" class="fg" data-ringh/></svg></button><span class="bx-led" data-led></span></div>
                <p class="muted small" data-holdmsg></p>`;
              holdBtn(body.querySelector("[data-hold]"));
            }
          };
          function holdBtn(btn) {
            const ring = btn.querySelector("[data-ringh]");
            const need = (R.hold || 3) * 1000;
            let t0 = 0, held = false;
            const L0 = 2 * Math.PI * 17;
            ring.style.strokeDasharray = L0;
            ring.style.strokeDashoffset = L0;
            const tick = (now) => {
              if (!held || !api.alive) return;
              const p = Math.min(1, (now - t0) / need);
              ring.style.strokeDashoffset = L0 * (1 - p);
              if (p >= 1) { held = false; ok(); return; }
              T.frame(tick);
            };
            const down = (e) => { e.preventDefault(); if (held) return; held = true; t0 = performance.now(); SND.play("pick"); T.frame(tick); };
            const up = () => {
              if (!held) return;
              held = false;
              ring.style.strokeDashoffset = L0;
              const m = root.querySelector("[data-holdmsg]");
              if (m) m.textContent = "Отпустил рано: индикатор не замигал. Держи, пока круг не заполнится.";
              SND.play("drop");
            };
            btn.addEventListener("pointerdown", down);
            btn.addEventListener("pointerup", up);
            btn.addEventListener("pointerleave", up);
            btn.addEventListener("pointercancel", up);
            btn.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) down(e); });
            btn.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") up(); });
            btn.addEventListener("contextmenu", (e) => e.preventDefault());
            function ok() {
              const led = root.querySelector("[data-led]");
              led.classList.add("blink");
              btn.disabled = true;
              const m = root.querySelector("[data-holdmsg]");
              m.textContent = "Индикатор мигает: плата сама переписывает BIOS с флешки. Ничего не трогай...";
              SND.play("level");
              T.anim(3000, () => {
                if (!api.alive) return;
                led.classList.remove("blink");
                led.classList.add("done");
                m.textContent = "Индикатор погас. Готово, можно включать!";
                api.hit(150, R.good || "Flashback спас плату без процессора и без экрана.");
                T.anim(1300, next);
              });
            }
          }
          root.onclick = (e) => {
            const n = e.target.closest("[data-n]");
            if (n && step === 0 && !n.disabled) {
              const o = R.names[Number(n.dataset.n)];
              if (o.ok) { api.hit(80, o.why); step = 1; T.anim(600, draw); }
              else { n.disabled = true; api.miss(o.why, { what: "Flashback" }); }
              return;
            }
            const pt = e.target.closest("[data-pt]");
            if (pt && step === 1 && !pt.disabled) {
              const o = R.ports[Number(pt.dataset.pt)];
              if (o.ok) { pt.classList.add("plugged"); SND.play("drop"); api.hit(80, "Флешка в порту Flashback."); step = 2; T.anim(700, draw); }
              else { pt.disabled = true; api.miss(o.why || "Flashback работает только из одного, особого порта. Он обведён рамкой и подписан.", { what: "Flashback" }); }
            }
          };
          draw();
        }
        show();
      }
      return { destroy() { T.clear(); root.onclick = null; } };
    },
  };
})();
