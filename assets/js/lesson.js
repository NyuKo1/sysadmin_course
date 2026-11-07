// Общее для страниц уроков: цепочка теория → игра, пароль, переключатели битов, форма ДЗ.
(function () {
  // ---------- пароль ----------
  // Это школьный замок, а не защита: текст лежит в странице, просто скрыт.
  function norm(s) { return s.trim().toLowerCase().replace(/ё/g, "е").replace(/[\s\-_.]+/g, ""); }
  function fingerprint(s) {
    s = "pamyatvil:" + norm(s);
    let h = 0x811c9dc5;
    for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, "0");
  }
  window.lessonFingerprint = fingerprint;

  function store(key, val) { try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; } }

  function lessonInfo(n) {
    for (const m of window.COURSE || []) for (const l of m.lessons) if (l.n === n) return l;
    return null;
  }

  const GIF = (name) => (document.documentElement.dataset.root || "./") + "assets/gif/" + name + ".gif";

  // Пароль урока открывает этот урок, пароль учителя открывает всё.
  function checkPass(value, info) {
    const f = fingerprint(value);
    if (window.TEACHER_PASS && f === window.TEACHER_PASS) { store("unlock-all", "1"); return true; }
    if (info && info.pass && f === info.pass) { store("unlock-" + info.n, "1"); return true; }
    return false;
  }

  function passForm(info, onOpen) {
    const form = document.createElement("form");
    form.className = "passform";
    form.innerHTML = `
      <input type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="пароль" aria-label="Пароль">
      <button class="btn" type="submit">Открыть</button>
      <p class="err" aria-live="polite"></p>`;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input");
      if (checkPass(input.value, info)) { onOpen(); return; }
      form.querySelector(".err").textContent = input.value.trim() ? "Неверный пароль, попробуй ещё раз" : "Введи пароль";
      form.classList.add("shake");
      setTimeout(() => form.classList.remove("shake"), 350);
    });
    return form;
  }

  // ---------- урок по цепочке: теория → игра → следующая теория ----------
  // Блоки с data-stage="K" открываются, когда выиграна игра из блока K-1.
  // Открытое запоминается, дома можно перечитать. Пароль урока открывает всё сразу.
  function mountStages() {
    const main = document.querySelector("[data-lesson]");
    if (!main) return;
    const n = Number(main.dataset.lesson);
    const info = lessonInfo(n);
    const stages = [...document.querySelectorAll("[data-stage]")];
    const max = Math.max(0, ...stages.map((el) => Number(el.dataset.stage)));
    const full = !info || !info.pass || store("unlock-" + n) === "1" || store("unlock-all") === "1";
    let open = full ? max : Math.min(max, Number(store("stage-" + n)) || 0);

    const gate = document.createElement("section");
    gate.className = "block gate";
    gate.innerHTML = `
      <img class="gif" src="${GIF("think")}" alt="" width="96" height="96">
      <h2>Дальше пока закрыто</h2>
      <p class="muted">Выиграй игру выше, и откроется следующая часть урока. Всё, что уже открыто, останется открытым: перечитывай, когда хочешь.</p>
      <details>
        <summary>У меня есть пароль от учителя</summary>
        <p class="muted">Пароль учитель скажет в конце урока. Он откроет весь урок сразу.</p>
      </details>`;
    gate.querySelector("details").append(passForm(info, () => { open = max; apply(); }));

    // Опционально: блок с data-gate="build" (настоящая сборка ПК на уроке) не имеет игры.
    // Следующая часть открывается «кодом сборки» от учителя (отпечаток info.buildPass).
    // Пароль урока и пароль учителя в этом же поле открывают весь урок.
    // Без data-gate="build" на странице карточка выглядит и работает как раньше.
    const buildSecs = stages.filter((el) => el.dataset.gate === "build");
    const plain = buildSecs.length ? { h2: gate.querySelector("h2").textContent, p: gate.querySelector("p.muted").textContent } : null;
    let buildForm = null;
    if (buildSecs.length) {
      buildForm = document.createElement("form");
      buildForm.className = "passform build-pass";
      buildForm.innerHTML = `
        <input type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="код сборки" aria-label="Код сборки">
        <button class="btn" type="submit">Проверить</button>
        <p class="err" aria-live="polite"></p>`;
      buildForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = buildForm.querySelector("input");
        const v = input.value;
        if (info && info.buildPass && v.trim() && fingerprint(v) === info.buildPass) {
          const k = buildStageOpen();
          if (k !== null && k + 1 > open) { open = Math.min(max, k + 1); store("stage-" + n, String(open)); }
          input.value = "";
          apply();
          const next = document.querySelector(`[data-stage="${open}"]`);
          if (next) next.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (checkPass(v, info)) { open = max; apply(); return; }
        buildForm.querySelector(".err").textContent = v.trim() ? "Код не подходит. Его скажет учитель, когда ПК пройдёт POST" : "Введи код сборки";
        buildForm.classList.add("shake");
        setTimeout(() => buildForm.classList.remove("shake"), 350);
      });
    }
    // Номер открытого этапа сборки, после которого стоит карточка, или null
    function buildStageOpen() {
      const s = buildSecs.find((el) => Number(el.dataset.stage) === open);
      return s ? open : null;
    }

    function apply() {
      stages.forEach((el) => el.classList.toggle("unlocked", Number(el.dataset.stage) <= open));
      document.querySelectorAll(".steps a[href^='#']").forEach((a) => {
        const t = document.querySelector(a.getAttribute("href"));
        a.classList.toggle("locked", !!(t && t.dataset.stage && Number(t.dataset.stage) > open));
      });
      if (open >= max) { gate.remove(); return; }
      if (buildForm) {
        const isBuild = buildStageOpen() !== null;
        gate.classList.toggle("gate-build", isBuild);
        gate.querySelector("h2").textContent = isBuild ? "Нужен код сборки" : plain.h2;
        gate.querySelector("p.muted").textContent = isBuild
          ? "Соберите компьютер командой. Когда он пройдёт POST и покажет BIOS, учитель скажет код сборки. Введи его здесь, и откроется финал урока."
          : plain.p;
        if (isBuild && !buildForm.isConnected) gate.querySelector("details").before(buildForm);
        if (!isBuild && buildForm.isConnected) buildForm.remove();
      }
      const shown = [...main.querySelectorAll(":scope > section.block:not(.gate)")]
        .filter((el) => !el.dataset.stage || Number(el.dataset.stage) <= open);
      shown[shown.length - 1].after(gate);
    }

    document.addEventListener("minigame:won", (e) => {
      const sec = e.target.closest("[data-stage]");
      const k = sec ? Number(sec.dataset.stage) : 0;
      if (k + 1 <= open || k >= max) return;
      open = k + 1;
      store("stage-" + n, String(open));
      apply();
      const next = document.querySelector(`[data-stage="${open}"]`);
      if (next && next.id) {
        const p = document.createElement("p");
        p.className = "game-next";
        p.innerHTML = `Открыта следующая часть урока. <a href="#${next.id}">Листай вниз ↓</a>`;
        e.target.querySelector(".game-intro")?.append(p);
      }
    });

    apply();
  }

  // ---------- страницы учителя: открываются только паролем учителя ----------
  function mountTeacherLock() {
    const box = document.querySelector('[data-lock="teacher"]');
    if (!box) return;
    const openAll = () => {
      document.querySelectorAll("[data-locked]").forEach((el) => el.classList.add("unlocked"));
      box.remove();
    };
    if (store("unlock-all") === "1") { openAll(); return; }
    box.innerHTML = `
      <img class="gif" src="${GIF("laptop")}" alt="" width="96" height="96">
      <h2>Страница учителя</h2>
      <p class="muted" style="margin:0">Введите пароль учителя.</p>`;
    box.append(passForm(null, openAll));
  }

  // ---------- наглядные переключатели битов ----------
  function updateExplorer(box) {
    let sum = 0;
    box.querySelectorAll(".bit").forEach((b) => {
      if (b.getAttribute("aria-pressed") === "true") sum += Number(b.dataset.w || 1);
    });
    const key = box.dataset.explorer;
    document.querySelectorAll(`[data-explorer-out="${key}"]`).forEach((o) => (o.textContent = sum));
    document.querySelectorAll(`[data-explorer-hex="${key}"]`).forEach((o) => (o.textContent = sum.toString(16).toUpperCase().padStart(2, "0")));
  }

  document.addEventListener("click", (e) => {
    const bit = e.target.closest("[data-explorer] .bit");
    if (!bit) return;
    const on = bit.getAttribute("aria-pressed") !== "true";
    bit.setAttribute("aria-pressed", String(on));
    bit.textContent = on ? "1" : "0";
    updateExplorer(bit.closest("[data-explorer]"));
  });

  // ---------- форма ДЗ ----------
  // Ссылки на формы лежат в assets/js/forms.js (их выдаёт скрипт Google Apps Script).
  function mountHomework() {
    document.querySelectorAll("[data-homework]").forEach((box) => {
      const key = box.dataset.homework;
      const url = (window.FORMS && window.FORMS[key]) || "";
      if (!url) {
        box.innerHTML = `<div class="hw-off">Форма домашнего задания появится здесь, когда учитель её добавит.</div>`;
        return;
      }
      if (!navigator.onLine) {
        box.innerHTML = `<div class="hw-off">Сейчас нет интернета. Домашнее задание откроется, когда телефон подключится к сети.</div>`;
        return;
      }
      const embed = url + (url.includes("?") ? "&" : "?") + "embedded=true";
      box.innerHTML = `<iframe class="hw-frame" src="${embed}" title="Домашнее задание" loading="lazy">Загрузка…</iframe>
        <p class="muted">Форма не открылась? <a href="${url}" target="_blank" rel="noopener">Открыть в новой вкладке</a></p>`;
    });
  }

  // ---------- чек-лист с галочками (опционально, урок 5: сборка ПК) ----------
  // <div data-checklist="имя"> с <input type="checkbox"> внутри. Галочки хранятся в этом браузере.
  // [data-checklist-count] показывает «сделано из всех», [data-checklist-reset] снимает галочки,
  // [data-print] печатает только свой блок (id блока в значении атрибута).
  function mountChecklists() {
    document.querySelectorAll("[data-checklist]").forEach((box) => {
      const key = "check-" + box.dataset.checklist;
      const boxes = [...box.querySelectorAll("input[type=checkbox]")];
      let saved = {};
      try { saved = JSON.parse(store(key) || "{}") || {}; } catch (e) { saved = {}; }
      const count = () => {
        const done = boxes.filter((b) => b.checked).length;
        box.querySelectorAll("[data-checklist-count]").forEach((o) => (o.textContent = done + " из " + boxes.length));
        box.classList.toggle("all-done", done === boxes.length);
      };
      boxes.forEach((b, i) => {
        const id = b.value || String(i);
        b.checked = !!saved[id];
        b.addEventListener("change", () => { saved[id] = b.checked; store(key, JSON.stringify(saved)); count(); });
      });
      box.querySelectorAll("[data-checklist-reset]").forEach((btn) => btn.addEventListener("click", () => {
        boxes.forEach((b) => (b.checked = false));
        saved = {};
        store(key, "{}");
        count();
      }));
      count();
    });
    document.querySelectorAll("[data-print]").forEach((btn) => btn.addEventListener("click", () => {
      const root = document.documentElement;
      root.dataset.printOnly = btn.dataset.print;
      const done = () => { delete root.dataset.printOnly; window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print();
    }));
  }

  document.addEventListener("DOMContentLoaded", () => { mountStages(); mountTeacherLock(); mountHomework(); mountChecklists(); });
  window.addEventListener("online", mountHomework);
})();
