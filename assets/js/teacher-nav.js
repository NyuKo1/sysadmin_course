// Навигатор по главам лекции для учителя: быстрые переходы, таймер урока
// и подсветка глав, которые есть в версии учеников.
// Главы берутся из разметки лекции: <section id> с <h2>, внутри <h3> и <span class="time">… · N мин</span>.
// Глава «у учеников», если в уроке учеников есть раздел с тем же id.
// Подглава «у учеников», если у неё есть атрибут data-student или такой же заголовок есть в уроке.
(function () {
  const article = document.querySelector(".lecture");
  if (!article) return;
  const n = (location.pathname.match(/(\d+)\.html$/) || [])[1];
  if (!n) return;
  const KEY = "tnav-" + n;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* без хранилища */ } }
  const st = Object.assign({ start: 0, paused: 0, done: {} }, load());

  const norm = (s) => s.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const chapters = [...article.querySelectorAll("section[id]")].map((sec) => {
    const h2 = sec.querySelector("h2");
    const t = sec.querySelector(".time");
    const min = t ? Number((t.textContent.match(/(\d+)\s*мин/) || [])[1]) || 0 : 0;
    const subs = [...sec.querySelectorAll("h3")].map((h, i) => {
      if (!h.id) h.id = sec.id + "-" + (i + 1);
      return { el: h, id: h.id, title: h.textContent.trim(), marked: h.hasAttribute("data-student") };
    });
    return { sec, id: sec.id, title: h2 ? h2.textContent.trim() : sec.id, min, subs, student: false };
  });
  if (!chapters.length) return;
  const total = chapters.reduce((a, c) => a + c.min, 0);

  // ---------- разметка ----------
  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "tnav-fab";
  fab.setAttribute("aria-expanded", "false");
  fab.innerHTML = `☰ Главы <span class="tnav-clock mono">0:00</span>`;

  const panel = document.createElement("aside");
  panel.className = "tnav";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Главы лекции");
  document.body.append(fab, panel);

  function fmt(ms) {
    const m = Math.floor(ms / 60000);
    return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0");
  }
  function elapsed() {
    if (!st.start) return 0;
    return (st.paused || Date.now()) - st.start;
  }

  let current = chapters[0].id;

  function render() {
    let acc = 0;
    const el = elapsed();
    const rows = chapters.map((c) => {
      const from = acc;
      acc += c.min;
      const done = !!st.done[c.id];
      const cls = ["tnav-ch", c.student ? "student" : "", done ? "done" : "", c.id === current ? "here" : ""].join(" ");
      const subs = c.subs.map((s) => `<li class="${s.marked ? "student" : ""}"><a href="#${s.id}">${esc(s.title)}</a></li>`).join("");
      return `
        <li class="${cls}">
          <div class="tnav-row">
            <label class="tnav-check" title="Пройдено"><input type="checkbox" data-done="${c.id}" ${done ? "checked" : ""}><span class="sr">Пройдено</span></label>
            <a href="#${c.id}">${esc(c.title)}</a>
            <span class="tnav-min mono">${c.min ? `${from}–${acc}` : ""}</span>
          </div>
          ${c.student ? `<span class="tnav-badge">у учеников</span>` : `<span class="tnav-badge only">только у вас</span>`}
          ${subs ? `<details ${c.id === current ? "open" : ""}><summary>${c.subs.length} подглав</summary><ol>${subs}</ol></details>` : ""}
        </li>`;
    }).join("");

    // Сколько должно было пройти к началу текущей главы
    let plan = 0;
    for (const c of chapters) { if (c.id === current) break; plan += c.min; }
    const doneMin = chapters.reduce((a, c) => a + (st.done[c.id] ? c.min : 0), 0);
    const diff = Math.round(el / 60000) - plan;
    const pace = !st.start ? "" : diff > 5 ? `<b class="late">отстаёте на ${diff} мин</b>` : diff < -5 ? `<b class="early">опережаете на ${-diff} мин</b>` : `<b class="ok">идёте по плану</b>`;

    panel.innerHTML = `
      <div class="tnav-head">
        <b>Урок ${Number(n)} · ${fmt(total * 60000)} по плану</b>
        <button type="button" class="tnav-x" data-act="close" aria-label="Закрыть">✕</button>
      </div>
      <div class="tnav-timer">
        <span class="mono big">${fmt(el)}</span>
        <span class="muted">${st.start ? `по плану к этой главе ${plan} мин · ${pace}` : "Запустите таймер в начале урока"}</span>
        <div class="tnav-btns">
          ${!st.start ? `<button type="button" class="btn" data-act="start">Старт урока</button>`
            : st.paused ? `<button type="button" class="btn" data-act="resume">Продолжить</button>`
            : `<button type="button" class="btn" data-act="pause">Пауза</button>`}
          ${st.start ? `<button type="button" class="btn ghost" data-act="reset">Сброс</button>` : ""}
        </div>
        <div class="tnav-bar" aria-hidden="true"><i style="width:${total ? Math.min(100, doneMin / total * 100) : 0}%"></i><u style="left:${total ? Math.min(100, el / 60000 / total * 100) : 0}%"></u></div>
        <span class="muted small">Отмечено пройденным: ${doneMin} из ${total} мин плана. Зелёная полоса показывает отмеченные главы, белая метка показывает, сколько времени прошло.</span>
      </div>
      <p class="tnav-legend"><span class="tnav-badge">у учеников</span> есть на сайте у детей · <span class="tnav-badge only">только у вас</span> только в лекции</p>
      <ol class="tnav-list">${rows}</ol>`;
    fab.querySelector(".tnav-clock").textContent = fmt(el);
    fab.classList.toggle("running", !!st.start && !st.paused);
  }

  function open(on) {
    panel.hidden = !on;
    fab.setAttribute("aria-expanded", String(on));
    if (on) render();
  }

  fab.addEventListener("click", () => open(panel.hidden));
  panel.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]");
    if (act) {
      const a = act.dataset.act;
      if (a === "close") open(false);
      if (a === "start") { st.start = Date.now(); st.paused = 0; }
      if (a === "pause") st.paused = Date.now();
      if (a === "resume") { st.start += Date.now() - st.paused; st.paused = 0; }
      if (a === "reset") { st.start = 0; st.paused = 0; st.done = {}; }
      save();
      render();
      return;
    }
    // На телефоне после перехода панель закрываем, чтобы не мешала читать
    if (e.target.closest("a[href^='#']") && matchMedia("(max-width: 900px)").matches) open(false);
  });
  panel.addEventListener("change", (e) => {
    const box = e.target.closest("[data-done]");
    if (!box) return;
    st.done[box.dataset.done] = box.checked;
    save();
    render();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) open(false); });

  setInterval(() => {
    fab.querySelector(".tnav-clock").textContent = fmt(elapsed());
    if (!panel.hidden && st.start && !st.paused) render();
  }, 15000);

  // Текущая глава по прокрутке
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting && current !== en.target.id) {
          current = en.target.id;
          if (!panel.hidden) render();
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    chapters.forEach((c) => io.observe(c.sec));
  }

  // Какие главы есть у учеников: смотрим страницу урока (она есть и в офлайн-кэше)
  const ROOT = document.documentElement.dataset.root || "../";
  fetch(ROOT + "lessons/" + n + ".html").then((r) => (r.ok ? r.text() : "")).then((html) => {
    if (!html) return;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const ids = new Set([...doc.querySelectorAll("section[id]")].map((s) => s.id));
    const heads = new Set([...doc.querySelectorAll("h2, h3")].map((h) => norm(h.textContent)));
    chapters.forEach((c) => {
      c.student = ids.has(c.id);
      c.subs.forEach((s) => { if (heads.has(norm(s.title))) s.marked = true; });
    });
  }).catch(() => {}).finally(() => {
    chapters.forEach((c) => c.subs.forEach((s) => s.el.classList.toggle("tnav-student", s.marked)));
    render();
  });

  // Кнопку показываем только когда лекция открыта паролем учителя
  function sync() { fab.hidden = !article.classList.contains("unlocked"); if (fab.hidden) open(false); }
  new MutationObserver(sync).observe(article, { attributes: true, attributeFilter: ["class"] });
  sync();
  render();
})();
