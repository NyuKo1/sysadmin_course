// Общее для страниц уроков: замок на теории, переключатели битов, форма ДЗ.
(function () {
  // ---------- замок ----------
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

  function openLesson(box) {
    document.querySelectorAll("[data-locked]").forEach((el) => el.classList.add("unlocked"));
    box.classList.add("open");
    box.innerHTML = `<p style="margin:0">Теория открыта. Листай вниз или <a href="#t1">начни с первого блока</a>.</p>`;
  }

  function mountLock() {
    const box = document.querySelector("[data-lock]");
    if (!box) return;
    const n = Number(box.dataset.lock);
    const info = lessonInfo(n);
    if (!info || !info.pass) { openLesson(box); return; }
    if (store("unlock-" + n) === "1" || store("unlock-all") === "1") { openLesson(box); return; }

    box.innerHTML = `
      <img class="gif" src="${document.documentElement.dataset.root || "./"}assets/gif/think.gif" alt="" width="96" height="96">
      <h2>Теория под замком</h2>
      <p class="muted" style="margin:0">Мини-игры уже открыты, они ниже. Пароль к теории и домашнему заданию учитель скажет в конце урока.</p>
      <form>
        <input type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="пароль" aria-label="Пароль">
        <button class="btn" type="submit">Открыть</button>
      </form>
      <p class="err" aria-live="polite"></p>`;
    box.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = box.querySelector("input");
      const f = fingerprint(input.value);
      if (f === info.pass) {
        store("unlock-" + n, "1");
        openLesson(box);
      } else if (f === window.TEACHER_PASS) {
        store("unlock-all", "1");
        openLesson(box);
      } else {
        box.querySelector(".err").textContent = input.value.trim() ? "Неверный пароль, попробуй ещё раз" : "Введи пароль";
        box.classList.add("shake");
        setTimeout(() => box.classList.remove("shake"), 350);
      }
    });
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

  document.addEventListener("DOMContentLoaded", () => { mountLock(); mountHomework(); });
  window.addEventListener("online", mountHomework);
})();
